import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import designsRouter from "./designs";
import designCommentsRouter from "./designComments";
import clientsRouter from "./clients";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(designsRouter);
router.use(designCommentsRouter);
router.use(clientsRouter);

export default router;
