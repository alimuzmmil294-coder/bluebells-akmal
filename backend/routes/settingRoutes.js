import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', getSettings);
router.put('/', requireAuth, requireAdmin, updateSettings);

export default router;
