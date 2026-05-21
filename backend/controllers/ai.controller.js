const aiService = require('../services/ai.service');

exports.chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'محتوى الرسالة مطلوب' });
    }

    const response = await aiService.askAi(message, req.user.id);
    return res.json(response);
  } catch (err) {
    next(err);
  }
};

exports.analysis = async (req, res, next) => {
  try {
    const data = aiService.getFullAnalysis(req.user.id);
    return res.json(data);
  } catch (err) {
    next(err);
  }
};
