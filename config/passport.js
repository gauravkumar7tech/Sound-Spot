const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

const oauthBaseUrl = (process.env.OAUTH_BASE_URL || 'https://soundspot-backend.onrender.com').replace(/\/+$/, '');
const configuredProviders = new Set();

function registerStrategy(provider, Strategy, clientID, clientSecret, options = {}) {
  if (!clientID || !clientSecret) {
    return;
  }

  passport.use(provider, new Strategy({
    clientID,
    clientSecret,
    callbackURL: `${oauthBaseUrl}/auth/${provider}/callback`,
    ...options,
  }, (accessToken, refreshToken, profile, done) => done(null, profile)));
  configuredProviders.add(provider);
}

registerStrategy('google', GoogleStrategy, process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
registerStrategy('facebook', FacebookStrategy, process.env.FACEBOOK_APP_ID, process.env.FACEBOOK_APP_SECRET, {
  graphAPIVersion: 'v26.0',
  profileFields: ['id', 'displayName', 'emails'],
});
registerStrategy('github', GitHubStrategy, process.env.GITHUB_CLIENT_ID, process.env.GITHUB_CLIENT_SECRET, {
  allRawEmails: true,
  userAgent: 'SoundSpot',
});
module.exports = { passport, configuredProviders, oauthBaseUrl };