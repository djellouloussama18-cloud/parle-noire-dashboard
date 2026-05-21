const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const notesController = require('../controllers/notes.controller');

router.use(authMiddleware);

router.get('/', notesController.getNotes);
router.get('/unread-count', notesController.getUnreadCount);
router.post('/', notesController.createNote);
router.put('/:id', notesController.updateNote);
router.put('/:id/read', notesController.markAsRead);
router.delete('/:id', notesController.deleteNote);

module.exports = router;
