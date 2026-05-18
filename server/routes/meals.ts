import { Router } from 'express'
import multer from 'multer'
import {
  createMealController,
  getMealsController,
  updateMealController,
  uploadMealImageController,
  deleteMealController,
} from '../controllers/mealsController'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.get('/', getMealsController)
router.post('/', upload.single('image'), createMealController)
router.patch('/:id/image', upload.single('image'), uploadMealImageController)
router.patch('/:id', updateMealController)
router.delete('/:id', deleteMealController)

export default router
