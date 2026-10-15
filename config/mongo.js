const mongoose = require("mongoose");

function getConnectionFailureReason(error) {
  const details = `${error.name || ""} ${error.code || ""} ${error.message || ""} ${error.cause?.message || ""}`;

  if (/bad auth|authentication failed|authenticationfailure|code 8000/i.test(details)) {
    return "MongoDB rejected the database credentials. Verify the Atlas database username and password.";
  }
  if (/ENOTFOUND|querysrv|ESERVFAIL/i.test(details)) {
    return "MongoDB hostname could not be resolved. Verify the Atlas cluster URI.";
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENETUNREACH|IP access/i.test(details)) {
    return "MongoDB could not be reached. Verify the Atlas IP access list and cluster network status.";
  }

  return `MongoDB connection failed (${error.name || "Error"}${error.code ? `, code ${error.code}` : ""}).`;
}

async function removeLegacyUsernameIndex() {
  try {
    const usersCollection = mongoose.connection.collection("users");
    const indexes = await usersCollection.indexes();
    const legacyIndex = indexes.find((index) => index.key && index.key.username === 1);

    if (legacyIndex) {
      await usersCollection.dropIndex(legacyIndex.name);
      console.log("Dropped legacy unique username index from MongoDB");
    }
  } catch (error) {
    console.warn("Legacy username index cleanup skipped:", error.message || error);
  }
}

function connectToMongoDB() {
  const primaryUri = process.env.MONGO_URI || process.env.CONNECTION_STRING;
  const fallbackUri = "mongodb://127.0.0.1:27017/soundspot";
  const uri = primaryUri || fallbackUri;

  const connect = async (connectionString) => {
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 15000,
      retryWrites: true,
      w: 'majority',
    });

    console.log("MongoDB connected");
    await removeLegacyUsernameIndex();
  };

  const handleFailure = async (err) => {
    if (primaryUri && uri === primaryUri) {
      console.error(getConnectionFailureReason(err));
      try {
        await connect(fallbackUri);
      } catch (fallbackErr) {
        console.error("MongoDB connection error:", fallbackErr.message || fallbackErr);
      }
      return;
    }

    console.error("MongoDB connection error:", err.message || err);
  };

  connect(uri).catch(handleFailure);
}

module.exports = { connectToMongoDB };
