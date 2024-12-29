import Stripe from "stripe";
import { CoursePurchase } from "../model/coursePurchase.model.js";
import { Course } from "../model/course.model.js";
import dotenv from "dotenv";
dotenv.config({});
import { v4 as uuidv4 } from 'uuid';
import { User } from "../model/user.model.js";
import { Lecture } from "../model/lecture.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found!" });

    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.coursePrice,
      status: "pending",
    });

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.courseTitle,
              images: [course.courseThumbnail],
            },
            unit_amount: course.coursePrice * 100, // Amount in paise (lowest denomination)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:5173/course-progress/${courseId}`, // once payment successful redirect to course progress page
      cancel_url: `http://localhost:5173/course-detail/${courseId}`,
      metadata: {
        courseId: courseId,
        userId: userId,
      },
      shipping_address_collection: {
        allowed_countries: ["IN"], // Optionally restrict allowed countries
      },
    });

    if (!session.url) {
      return res
        .status(400)
        .json({ success: false, message: "Error while creating session" });
    }

    // Save the purchase record
    newPurchase.paymentId = session.id;
    await newPurchase.save();

    return res.status(200).json({
      success: true,
      url: session.url, // Return the Stripe checkout URL
    });
  } catch (error) {
    console.log(error);
  }
};

export const stripeWebhook = async (req, res) => {
  let event;

  try {
    const payloadString = JSON.stringify(req.body, null, 2);
    const secret = process.env.WEBHOOK_ENDPOINT_SECRET;

    const header = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    });

    event = stripe.webhooks.constructEvent(payloadString, header, secret);
  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  // Handle the checkout session completed event
  if (event.type === "checkout.session.completed") {
    console.log("check session complete is called");

    try {
      const session = event.data.object;

      const purchase = await CoursePurchase.findOne({
        paymentId: session.id,
      }).populate({ path: "courseId" });

      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }

      if (session.amount_total) {
        purchase.amount = session.amount_total / 100;
      }
      purchase.status = "completed";

      // Make all lectures visible by setting `isPreviewFree` to true
      if (purchase.courseId && purchase.courseId.lectures.length > 0) {
        await Lecture.updateMany(
          { _id: { $in: purchase.courseId.lectures } },
          { $set: { isPreviewFree: true } }
        );
      }

      await purchase.save();

      // Update user's enrolledCourses
      await User.findByIdAndUpdate(
        purchase.userId,
        { $addToSet: { enrolledCourses: purchase.courseId._id } }, // Add course ID to enrolledCourses
        { new: true }
      );

      // Update course to add user ID to enrolledStudents
      await Course.findByIdAndUpdate(
        purchase.courseId._id,
        { $addToSet: { enrolledStudents: purchase.userId } }, // Add user ID to enrolledStudents
        { new: true }
      );
    } catch (error) {
      console.error("Error handling event:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  res.status(200).send();
};

// export const createCoursePurchase = async (req, res) => {
//   try {
//     const userId = req.id;
//     const { courseId } = req.params;

//     const course = await Course.findById(courseId);
//     if (!course) return res.status(404).json({ message: "Course not found!" });

//     const newPurchase = await CoursePurchase.create({
//       courseId,
//       userId,
//       amount: course.coursePrice,
//       status: "completed",
//     });

//     return res.status(200).json({
//       message: "Course Purchase Successfully",
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       message: "Failed to get course by id",
//     });
//   }
// };


export const createCoursePurchase = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.params;

    // Find the course
    const course = await Course.findById(courseId).populate("lectures");
    if (!course) {
      return res.status(404).json({ message: "Course not found!" });
    }

    // Check if the user already purchased this course
    let purchase = await CoursePurchase.findOne({ userId, courseId });

    if (!purchase) {
      // If no existing purchase, create a new one
      const paymentId = uuidv4(); // Generate a new unique payment ID
      purchase = new CoursePurchase({
        courseId,
        userId,
        paymentId,
        amount: course.coursePrice,
        status: "completed",
      });

      await purchase.save();
    }

    await Course.findByIdAndUpdate(
      courseId,
      { $addToSet: { enrolledStudents: userId } }, // Add userId only if it's not already in the array
      { new: true } // Optionally return the updated document
    );
    // course.enrolledStudents.push(userId);
    // await course.save();

    // Update user's enrolledCourses (ensure no duplicate IDs)
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { enrolledCourse: courseId } }, // Add courseId only if it's not already in the array
      { new: true } // Optionally return the updated document
    );

    // const user = await User.findById(userId);
    // user.enrolledCourse.push(courseId)

    // await user.save();

    // Update all lectures in the course to make them non-preview
    if (course.lectures && course.lectures.length > 0) {
      await Lecture.updateMany(
        { _id: { $in: course.lectures } },
        { $set: { isPreviewFree: true } }
      );
    }

    return res.status(200).json({
      message: "Course purchased successfully",
      paymentId: purchase.paymentId,
      courseId,
    });
  } catch (error) {
    console.error("Error in course purchase:", error);
    return res.status(500).json({
      message: "Failed to complete course purchase",
    });
  }
};



export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId)
      .populate({ path: "creator" })
      .populate({ path: "lectures" });

    const purchased = await CoursePurchase.findOne({ userId, courseId });
    console.log(purchased);

    if (!course) {
      return res.status(404).json({ message: "course not found!" });
    }

    return res.status(200).json({
      course,
      purchased: !!purchased, // true if purchased, false otherwise
    });
  } catch (error) {
    console.log(error);
  }
};

export const getAllPurchasedCourse = async (_, res) => {
  try {
    const purchasedCourse = await CoursePurchase.find({
      status: "completed",
    }).populate("courseId");
    if (!purchasedCourse) {
      return res.status(404).json({
        purchasedCourse: [],
      });
    }
    return res.status(200).json({
      purchasedCourse,
    });
  } catch (error) {
    console.log(error);
  }
};



// export const createCoursePurchase = async (req, res) => {
//   try {
//     const userId = req.id; // Assuming the user ID is extracted from a middleware
//     const { courseId } = req.params;

//     // Fetch the course by ID
//     const course = await Course.findById(courseId);
//     if (!course) {
//       return res.status(404).json({ message: "Course not found!" });
//     }

//     // Create a new purchase record
//     const newPurchase = await CoursePurchase.create({
//       courseId,
//       userId,
//       amount: course.coursePrice,
//       status: "completed",
//     });

//     // Make all lectures of the course visible to the user by updating `isPreviewFree`
//     if (course.lectures && course.lectures.length > 0) {
//       await Lecture.updateMany(
//         { _id: { $in: course.lectures } },
//         { $set: { isPreviewFree: true } }
//       );
//     }

//     // Update the user's enrolledCourses
//     await User.findByIdAndUpdate(
//       userId,
//       { $addToSet: { enrolledCourses: courseId } }, // Add the course ID if not already present
//       { new: true }
//     );

//     // Update the course's enrolledStudents
//     await Course.findByIdAndUpdate(
//       courseId,
//       { $addToSet: { enrolledStudents: userId } }, // Add the user ID if not already present
//       { new: true }
//     );

//     // Send a success response
//     return res.status(200).json({
//       success: true,
//       message: "Course purchased successfully!",
//     });
//   } catch (error) {
//     console.error("Error in createCoursePurchase:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to purchase course",
//     });
//   }
// };
