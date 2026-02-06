
import { Router } from 'express';
import * as promptController from '../../controllers/promptController.ts';

const router = Router();

router.get('/', promptController.getPrompts);
router.post('/', promptController.createPrompt);
router.put('/:id', promptController.updatePrompt);
router.delete('/:id', promptController.deletePrompt);
router.post('/:id/usage', promptController.trackUsage);

// Category routes
router.get('/categories', promptController.getCategories);
router.post('/categories', promptController.createCategory);
router.put('/categories/:id', promptController.updateCategory);
router.delete('/categories/:id', promptController.deleteCategory);

export default router;
