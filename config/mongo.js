const mongoose = require("mongoose");

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
      console.warn("Primary MongoDB URI failed. Retrying with local MongoDB fallback...");
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
