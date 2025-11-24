import { Router } from 'express';
import { authGoogleCalendar, googleCalendarCallback, disconnectGoogleCalendar, checkGoogleCalendarConnection } from '../controllers/googleCalendarController';
import { autenticarToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/auth', autenticarToken, authGoogleCalendar);
router.get('/callback', googleCalendarCallback); // Não precisa de autenticação, pois o estado já contém o profissionalId
router.post('/disconnect', autenticarToken, disconnectGoogleCalendar);
router.get('/check', autenticarToken, checkGoogleCalendarConnection);

export default router;

