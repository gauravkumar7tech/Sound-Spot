const User = require("../models/Users.js");
const bcrypt = require("bcrypt");
const crypto = require('crypto');
const {
    sendVerificationOtpEmail,
    sendVerificationOtpSms,
} = require("../services/emailService.js");

const hashVerificationCode = (email, code) => crypto
    .createHmac('sha256', process.env.SESSION_SECRET || 'development-only-secret')
    .update(`${email}:${code}`)
    .digest('hex');

const getPhoneWithCountryCode = (phone, country) => {
    const countryCodes = {
        Australia: '+61',
        India: '+91',
        'United States': '+1',
        'United Kingdom': '+44',
    };
    const nationalNumber = ['Australia', 'United Kingdom'].includes(country)
        ? phone.replace(/^0/, '')
        : phone;
    return `${countryCodes[country]}${nationalNumber}`;
};

const registrationProcess = async (req, res) => {
    try {
        const { firstname, email: submittedEmail, password, confirmPassword, phone_number, gender, country, verificationMethod } = req.body;
        const email = (submittedEmail || '').trim().toLowerCase();

        const errors = {};

        if (!firstname) {
            errors.name = 'Please enter your name';
        } else if (!/^[a-zA-Z ]+$/.test(firstname)) {
            errors.name = 'Name should only contain alphabets and spaces';
        }

        if (!email) {
            errors.email = 'Please enter your email address';
        } else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!password) {
            errors.password = 'Please enter your password';
        } else if (password.length < 3) {
            errors.password = 'Password must be at least 3 characters long';
        }

        if (password !== confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        if (!phone_number) {
            errors.phone_number = 'Please enter your mobile number';
        } else if (!/^\d{10}$/.test(phone_number)) {
            errors.phone_number = 'Please enter a valid 10-digit phone number';
        }

        if (!gender) {
            errors.gender = 'Please select your gender';
        }

        if (!['Australia', 'India', 'United States', 'United Kingdom'].includes(country)) {
            errors.country = 'Please select your country';
        }

        if (!['email', 'phone'].includes(verificationMethod)) {
            errors.verificationMethod = 'Choose email or phone verification';
        }

        

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, errors: { email: 'Email already in use' } });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = crypto.randomInt(100000, 1000000).toString();
        const now = new Date();
        const verificationCodeHash = hashVerificationCode(email, verificationCode);

        if (verificationMethod === 'email') {
            await sendVerificationOtpEmail(email, verificationCode);
        } else {
            await sendVerificationOtpSms(getPhoneWithCountryCode(phone_number, country), verificationCode);
        }

        const newUser = new User({
            username: firstname,
            password: hashedPassword,
            email,
            phone: phone_number,
            gender,
            country,
            type: 'user',
            verificationCodeHash,
            verificationCodeExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
            verificationCodeSentAt: now,
            verificationAttempts: 0,
            verificationMethod,
            isVerified: false,
        });

        await newUser.save();

        res.status(200).json({ success: true, message: `A verification code was sent to your ${verificationMethod}.` });
    } catch (error) {
        console.error(error);

        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                errors: {
                    general: 'An account with this email or username already exists.'
                }
            });
        }

        res.status(500).json({ success: false, errors: { general: error.message || 'Could not send the verification code. Check your provider settings and try again.' } });
    }
};

module.exports = {
    registrationProcess,
};
