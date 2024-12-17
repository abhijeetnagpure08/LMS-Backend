import { Course } from "../model/course.model.js";
import {deleteMediaFromCloudinary, uploadmedia} from "../utils/cloudinary.js"

export const createCourse = async (req, res) => {
  try {
    const { courseTitle, category } = req.body;
    if (!courseTitle || !category) {
      return res.status(400).json({
        message: "CourseTitle and Category are required.",
      });
    }

    const course = await Course.create({
      courseTitle,
      category,
      creator: req.id,
    });

    return res.status(201).json({
      course,
      message: "Course created.",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Failed to create course",
    });
  }
};

export const getCreatorCourses = async (req, res) => {
  try {
    const userId = req.id;
    const courses = await Course.find({ creator: userId });
    if (!courses) {
      return res.status(404).json({
        course: [],
        message: "Course not Found",
      });
    }

    return res.status(200).json({
      courses,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to get course",
    });
  }
};

export const editCourse = async (req, res) => {
  try {
    const { courseTitle, subTitle, description, category, courseLevel, coursePrice } = req.body;
    const thumbnail = req.file;
    const { courseId } = req.params;

    console.log({ courseId, body: req.body, file: req.file });

    let course = await Course.findById(courseId);
    console.log(courseId, course, course._id)
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    let courseThumbnail = course.courseThumbnail;
    if (thumbnail) {
      if (courseThumbnail) {
        const publicId = courseThumbnail.split("/").pop().split(".")[0];
        console.log("Deleting thumbnail:", publicId);
        await deleteMediaFromCloudinary(publicId);
      }
      const uploadResult = await uploadmedia(thumbnail.path);
      courseThumbnail = uploadResult.secure_url;
    }

    const updateData = { courseTitle, subTitle, description, category, courseLevel, coursePrice, courseThumbnail };
    course = await Course.findByIdAndUpdate(courseId, updateData, { new: true });

    return res.status(200).json({ course, message: "Course updated successfully" });
  } catch (error) {
    console.error("Error in editCourse:", error);
    return res.status(500).json({ message: "Failed to update course" });
  }
};


// export const editCourse = async (req, res) => {
//   try {
//     const {courseTitle, subTitle, description, category, courseLevel, coursePrice} = req.body;
//     const thumbnail = req.file;
//     const courseId = req.params.courseId;
    
//     const course = await Course.findById(courseId)
//     if (!course) {
//       return res.status(404).json({
//         course: [],
//         message: "Course not Found",
//       });
//     }
//     let courseThumbnail;
//     if(thumbnail){
//       if(course.courseThumbnail){
//         const publicId = course.courseThumbnail.split("/").pop().split(".")[0];
//         await deleteMediaFromCloudinary(publicId)
//       }
//       const uploadResult = await uploadmedia(thumbnail.path); 
//       courseThumbnail = uploadResult.secure_url;
//     }

//     const updateData = {courseTitle, subTitle, description, category, courseLevel, coursePrice,courseThumbnail};

//     course = await Course.findByIdAndUpdate(courseId, updateData,{new:true})

//     return res.status(200).json({
//       course,
//       message: "Courses updated"
//     });

//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       message: "Failed to get course",
//     });
//   }
  
// };
