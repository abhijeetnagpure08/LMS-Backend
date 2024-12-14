import { v2 as cloudinary } from 'cloudinary';
import dotenv from "dotenv";

dotenv.config({});

cloudinary.config({
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
    cloud_name: process.env.CLOUD_NAME,

})

export const uploadmedia = async (file) => {
    try {
        const uploadresponse = await cloudinary.uploader.upload(file, {
            resource_type:'auto'
        });
        return uploadresponse;
    } catch (error) {
        console.log(error);
    }
}

export const deleteMediaFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId)
    } catch (error) {
        console.log(error);
        
    }
}

export const deleteVideoFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId, {resource_type:"video"})
    } catch (error) {
        console.log(error);
        
    }
}