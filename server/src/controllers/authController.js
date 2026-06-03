const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { User } = require('../models');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, location_id } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password, role, phone, location_id });
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully.',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    const token = generateToken(user);

    res.json({
      message: 'Login successful.',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res) => {
  res.json({ user: req.user.toJSON() });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    await req.user.update({ name, phone });
    res.json({ message: 'Profile updated.', user: req.user.toJSON() });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    await req.user.update({ password: newPassword });
    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};
