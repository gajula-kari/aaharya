import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { logEventController } from '../controllers/eventsController'

const router = Router()

router.use(requireAuth)
router.post('/', logEventController)

export default router
