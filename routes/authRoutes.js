const express = require('express');
const router  = express.Router();
const AuthController = require('../controllers/AuthController');

router.post('/register',               (req, res, next) => AuthController.register(req, res).catch(next));
router.post('/login',                  (req, res, next) => AuthController.login(req, res).catch(next));
router.get('/profile',                 (req, res, next) => AuthController.getProfile(req, res).catch(next));
router.put('/profile',                 (req, res, next) => AuthController.updateProfile(req, res).catch(next));
router.post('/profile/image',          (req, res, next) => AuthController.saveProfileImage(req, res).catch(next));
router.get('/profile/image',           (req, res, next) => AuthController.getProfileImage(req, res).catch(next));
router.post('/reset-password-direct',  (req, res, next) => AuthController.resetPasswordDirect(req, res).catch(next));
router.post('/request-reset',          (req, res, next) => AuthController.requestReset(req, res).catch(next));
router.post('/reset-password',         (req, res, next) => AuthController.resetPassword(req, res).catch(next));

module.exports = router;
