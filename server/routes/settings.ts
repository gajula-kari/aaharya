import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getSettingsController, upsertSettingsController } from '../controllers/settingsController'

const router = Router()

router.use(requireAuth)

router.get('/', getSettingsController)
router.patch('/', upsertSettingsController)

export default router
