import express from 'express';
import { getBudget, 
    createBudget, 
    updateBudget, 
    deleteBudget, 
    analyzeBudgets} 
from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Apply the protect middleware to all routes in this router

router.get('/', getBudget);
router.post('/', createBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);
router.post('/analyze', analyzeBudgets);

export default router;