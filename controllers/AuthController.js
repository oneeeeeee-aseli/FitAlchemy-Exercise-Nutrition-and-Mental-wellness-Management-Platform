const User = require('../models/User');
const transporter = require('../config/email');
const resetCodes = require('../config/resetCodes');
const bcrypt = require('bcrypt');

class AuthController {
  static async register(req, res) {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required." });
    const users = await User.findByEmail(email);
    if (users.length > 0) return res.status(400).json({ message: "Email already registered." });
    await User.register(email, password);
    res.json({ message: "Registration successful!" });
  }

  static async login(req, res) {
    const { email, password } = req.body;
    const users = await User.findByEmail(email);
    if (users.length === 0) return res.status(400).json({ message: "Email not registered." });
    const user = users[0];
    const match = await User.verifyPassword(password, user.password);
    if (!match) return res.status(400).json({ message: "Incorrect password." });
    res.json({ message: "Login successful!", userId: user.id });
  }

  static async getProfile(req, res) {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId required." });
    const profile = await User.getProfile(userId);
    if (!profile) return res.status(404).json({ message: "User not found." });
    res.json(profile);
  }

  static async updateProfile(req, res) {
    const { userId, full_name, age, height, weight, fitness_goal, dietary_preference } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required." });
    await User.updateProfile(userId, { full_name, age, height, weight, fitness_goal, dietary_preference });
    res.json({ message: "Profile updated successfully!" });
  }

  static async saveProfileImage(req, res) {
    const { userId, imageBase64 } = req.body;
    if (!userId || !imageBase64) return res.status(400).json({ message: "userId and imageBase64 required." });
    // Limit size — base64 of 2MB image ~2.7MB string
    if (imageBase64.length > 3 * 1024 * 1024) return res.status(400).json({ message: "Image too large. Max 2MB." });
    await User.saveProfileImage(userId, imageBase64);
    res.json({ message: "Profile image saved." });
  }

  static async getProfileImage(req, res) {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId required." });
    const image = await User.getProfileImage(userId);
    res.json({ profileImage: image || null });
  }

  static async resetPasswordDirect(req, res) {
    try {
      const { userId, currentPassword, newPassword } = req.body;
      if (!userId || !currentPassword || !newPassword) return res.status(400).json({ message: "All fields are required." });
      const bcrypt = require('bcrypt');
      const db     = require('../config/database');
      // Verify current password first
      const [rows] = await db.query('SELECT password FROM users WHERE id=?', [userId]);
      if (!rows.length) return res.status(404).json({ message: "User not found." });
      const match = await bcrypt.compare(currentPassword, rows[0].password);
      if (!match) return res.status(401).json({ message: "Current password is incorrect." });
      // Update with new password
      const hashed = await bcrypt.hash(newPassword, 10);
      await db.query('UPDATE users SET password=? WHERE id=?', [hashed, userId]);
      res.json({ message: "Password updated successfully!" });
    } catch (err) {
      res.status(500).json({ message: "Failed to update password." });
    }
  }

  static async requestReset(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required." });
      const users = await User.findByEmail(email);
      if (users.length === 0) return res.status(400).json({ message: "Email not registered." });
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      resetCodes.set(email, { code, expiresAt });
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Code - FitAlchemy',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#2d6cdf;">Password Reset Request</h2>
          <p>Your verification code is:</p>
          <div style="background:#f0f0f0;padding:20px;text-align:center;font-size:24px;font-weight:bold;color:#2d6cdf;border-radius:8px;margin:20px 0;">${code}</div>
          <p>This code expires in 10 minutes.</p>
          <p>Best regards,<br>FitAlchemy Team</p>
        </div>`
      };
      await transporter.sendMail(mailOptions);
      res.json({ message: "Reset code sent to your email." });
    } catch (error) {
      res.status(500).json({ message: "Failed to send reset code.", error: error.message });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) return res.status(400).json({ message: "Email, code, and new password required." });
      const resetData = resetCodes.get(email);
      if (!resetData) return res.status(400).json({ message: "No reset code found." });
      if (resetData.code !== code) return res.status(400).json({ message: "Invalid verification code." });
      if (new Date() > resetData.expiresAt) { resetCodes.delete(email); return res.status(400).json({ message: "Code expired." }); }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.updatePassword(email, hashedPassword);
      resetCodes.delete(email);
      res.json({ message: "Password reset successful!" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password." });
    }
  }
}

module.exports = AuthController;
