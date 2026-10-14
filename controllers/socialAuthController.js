const User = require('../models/Users.js');
const crypto = require('crypto');
const { oauthBaseUrl } = require('../config/passport.js');

const getVerifiedEmail = (provider, profile) => {
  const email = (profile.emails || [])
    .map((entry) => ({ value: (entry.value || '').trim().toLowerCase(), verified: entry.verified }))
    .find((entry) => entry.value && (provider !== 'github' || entry.verified === true));

  if (!email) {
    throw new Error('The provider did not return a verified email address.');
  }
  if (['google', 'linkedin'].includes(provider) && profile._json?.email_verified !== true) {
    throw new Error('The provider email address is not verified.');
  }

  return email.value;
};

const getUsername = (profile, email) => {
  const name = profile.displayName || [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ');
  const username = (name || email.split('@')[0])
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return username || 'SoundSpot User';
};

const findOrCreateUser = async (provider, profile) => {
  if (!profile.id) {
    throw new Error('The provider did not return an account ID.');
  }

  const providerId = String(profile.id);
  let user = await User.findOne({ socialAccounts: { $elemMatch: { provider, providerId } } });
  if (user) {
    return user;
  }

  const email = getVerifiedEmail(provider, profile);
  user = await User.findOne({ email });

  if (user) {
    if (!user.isVerified) {
      throw new Error('An unverified account already uses this email. Verify it before signing in with a provider.');
    }
    user.socialAccounts.push({ provider, providerId });
    await user.save();
    return user;
  }

  return User.create({
    username: getUsername(profile, email),
    email,
    type: 'user',
    isVerified: true,
    socialAccounts: [{ provider, providerId }],
  });
};

const finishSocialLogin = async (req, res, provider, profile) => {
  const user = await findOrCreateUser(provider, profile);
  req.session.user = user;

  req.session.save((error) => {
    if (error) {
      console.error('Could not save social sign-in session:', error.message || error);
      return res.redirect('/index?authError=failed');
    }
    return res.redirect(user.type === 'admin' ? '/auth/home' : '/auth/UserHomePage');
  });
};

const startLinkedInLogin = (req, res) => {
  const { LINKEDIN_CLIENT_ID } = process.env;
  if (!LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    return res.redirect('/index?authError=provider-not-configured');
  }

  const state = crypto.randomBytes(32).toString('hex');
  req.session.linkedinOAuthState = state;
  req.session.save((error) => {
    if (error) {
      console.error('Could not save LinkedIn OAuth state:', error.message || error);
      return res.redirect('/index?authError=failed');
    }

    const authorizationUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authorizationUrl.search = new URLSearchParams({
      response_type: 'code',
      client_id: LINKEDIN_CLIENT_ID,
      redirect_uri: `${oauthBaseUrl}/auth/linkedin/callback`,
      scope: 'openid profile email',
      state,
    });
    return res.redirect(authorizationUrl.toString());
  });
};

const finishLinkedInLogin = async (req, res) => {
  const expectedState = req.session.linkedinOAuthState;
  const receivedState = typeof req.query.state === 'string' ? req.query.state : '';
  delete req.session.linkedinOAuthState;

  if (!expectedState || !receivedState || expectedState.length !== receivedState.length ||
      !crypto.timingSafeEqual(Buffer.from(expectedState), Buffer.from(receivedState))) {
    throw new Error('Invalid LinkedIn OAuth state.');
  }
  if (typeof req.query.code !== 'string') {
    throw new Error('LinkedIn did not return an authorization code.');
  }

  await new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });

  const callbackUrl = `${oauthBaseUrl}/auth/linkedin/callback`;
  const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: callbackUrl,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error(`LinkedIn token exchange failed (HTTP ${tokenResponse.status}).`);
  }

  const tokenData = await tokenResponse.json();
  const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileResponse.ok) {
    throw new Error(`LinkedIn profile request failed (HTTP ${profileResponse.status}).`);
  }

  const linkedInProfile = await profileResponse.json();
  return finishSocialLogin(req, res, 'linkedin', {
    id: linkedInProfile.sub,
    displayName: linkedInProfile.name,
    name: {
      givenName: linkedInProfile.given_name,
      familyName: linkedInProfile.family_name,
    },
    emails: linkedInProfile.email ? [{
      value: linkedInProfile.email,
      verified: linkedInProfile.email_verified,
    }] : [],
    _json: linkedInProfile,
  });
};

module.exports = { finishSocialLogin, startLinkedInLogin, finishLinkedInLogin };