import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { 
  getSkills, 
  uploadSkill, 
  toggleSkillStatus, 
  deleteSkill 
} from '../../controllers/skillsController.ts';
import { requireAdmin } from '../../middleware/auth.ts';

const router = express.Router();

// Apply Auth Middleware Globally for this router
router.use(requireAdmin);

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Vercel / Serverless compatibility: Use system temp directory
    const uploadDir = path.join(os.tmpdir(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed!'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Routes
/**
 * @openapi
 * /api/admin/skills:
 *   get:
 *     tags: [Admin - Skills]
 *     summary: List AI skills
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of skills
 */
router.get('/', getSkills);

/**
 * @openapi
 * /api/admin/skills/upload:
 *   post:
 *     tags: [Admin - Skills]
 *     summary: Upload a new skill (ZIP)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Skill uploaded
 */
router.post('/upload', upload.single('file'), uploadSkill);

/**
 * @openapi
 * /api/admin/skills/{id}/status:
 *   patch:
 *     tags: [Admin - Skills]
 *     summary: Toggle skill status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', toggleSkillStatus);

/**
 * @openapi
 * /api/admin/skills/{id}:
 *   delete:
 *     tags: [Admin - Skills]
 *     summary: Delete a skill
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/:id', deleteSkill);

export default router;
