import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../lib/cloudinary.js";

// helper function for cloudinary uploads
const uploadToCloudinary = async (file) => {
    try {
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
            resource_type: "auto",
        });
        return result.secure_url;
    } catch (error) {
        console.log("Error in uploadToCloudinary", error);
        throw new Error("Error uploading to cloudinary");
    }
};

export const createSong = async (req, res, next) => {
    try {
        if (!req.files || !req.files.audioFile || !req.files.imageFile) {
            return res.status(400).json({ message: "Please upload all files" });
        }

        const { title, artist, albumId, duration } = req.body;
        const audioFile = req.files.audioFile;
        const imageFile = req.files.imageFile;

        const audioUrl = await uploadToCloudinary(audioFile);
        const imageUrl = await uploadToCloudinary(imageFile);

        const song = new Song({
            title,
            artist,
            audioUrl,
            imageUrl,
            duration,
            albumId: albumId || null,
        });

        await song.save();

        // if song belongs to an album, update the album's songs array
        if (albumId) {
            await Album.findByIdAndUpdate(albumId, {
                $push: { songs: song._id },
            });
        }
        res.status(201).json(song);
    } catch (error) {
        console.log("Error in createSong", error);
        next(error);
    }
};

export const deleteSong = async (req, res, next) => {
    try {
        const { id } = req.params;

        const song = await Song.findById(id);

        // if song belongs to an album, update the album's songs array
        if (song.albumId) {
            await Album.findByIdAndUpdate(song.albumId, {
                $pull: { songs: song._id },
            });
        }

        await Song.findByIdAndDelete(id);

        res.status(200).json({ message: "Song deleted successfully" });
    } catch (error) {
        console.log("Error in deleteSong", error);
        next(error);
    }
};

export const createAlbum = async (req, res, next) => {
    try {
        const { title, artist, releaseYear } = req.body;
        const { imageFile } = req.files;

        const imageUrl = await uploadToCloudinary(imageFile);

        const album = new Album({
            title,
            artist,
            imageUrl,
            releaseYear,
        });

        await album.save();

        res.status(201).json(album);
    } catch (error) {
        console.log("Error in createAlbum", error);
        next(error);
    }
};

export const deleteAlbum = async (req, res, next) => {
    try {
        const { id } = req.params;
        await Song.deleteMany({ albumId: id });
        await Album.findByIdAndDelete(id);
        res.status(200).json({ message: "Album deleted successfully" });
    } catch (error) {
        console.log("Error in deleteAlbum", error);
        next(error);
    }
};

export const checkAdmin = async (req, res, next) => {
    res.status(200).json({ admin: true });
};

export const editAlbum = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, artist, releaseYear } = req.body;

        // Find the album in the DB
        const album = await Album.findById(id);
        if (!album) {
            return res.status(404).json({ message: "Album not found" });
        }

        // If a new image file is provided, upload it and set album.imageUrl
        if (req.files?.imageFile) {
            const newImageUrl = await uploadToCloudinary(req.files.imageFile);
            album.imageUrl = newImageUrl;
        }

        // Update album fields if they were provided
        if (title) album.title = title;
        if (artist) album.artist = artist;
        if (releaseYear) album.releaseYear = releaseYear;

        // Save and return the updated album
        await album.save();
        res.status(200).json(album);
    } catch (error) {
        console.log("Error in editAlbum", error);
        next(error);
    }
};


export const editSong = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, artist, duration, albumId } = req.body;

        const song = await Song.findById(id);
        if (!song) {
            return res.status(404).json({ message: "Song not found" });
        }

        const oldAlbumId = song.albumId?.toString();

        // Handle album change
        if (oldAlbumId && oldAlbumId !== albumId) {
            await Album.findByIdAndUpdate(oldAlbumId, {
                $pull: { songs: song._id },
            });
        }

        if (albumId && albumId !== oldAlbumId) {
            await Album.findByIdAndUpdate(albumId, {
                $push: { songs: song._id },
            });
        }

        // Handle file updates
        if (req.files?.audioFile) {
            const newAudioUrl = await uploadToCloudinary(req.files.audioFile);
            song.audioUrl = newAudioUrl;
        }

        if (req.files?.imageFile) {
            const newImageUrl = await uploadToCloudinary(req.files.imageFile);
            song.imageUrl = newImageUrl;
        }

        // Update metadata
        if (title) song.title = title;
        if (artist) song.artist = artist;
        if (duration) song.duration = duration;
        if (albumId) song.albumId = albumId;

        await song.save();

        res.status(200).json(song);
    } catch (error) {
        console.log("Error in editSong", error);
        next(error);
    }
};
