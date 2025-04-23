import { Router } from "express";
import { getAllSongs, getFeaturedSong, getMadeforYouSongs, getTrendingSongs } from "../controller/song.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protectRoute, requireAdmin, getAllSongs);
router.get("/featured", getFeaturedSong);
router.get("/made-for-you", getMadeforYouSongs);
router.get("/trending", getTrendingSongs);

export default router