import { Router } from 'express'
import multer from 'multer'
import {
  createMealController,
  getMealsController,
  updateMealController,
  deleteMealController,
} from '../controllers/mealsController'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.get('/', getMealsController)
router.post('/', upload.single('image'), createMealController)
router.patch('/:id', updateMealController)
router.delete('/:id', deleteMealController)

export default router
