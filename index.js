import express from "express";
import dotenv from "dotenv";
import connectDB from "./database/db.js";
import userRoute from "./routes/user.route.js";
import courseRoute from "./routes/course.route.js";
import mediaRoute from "./routes/media.route.js";
import purchaseRoute from "./routes/purchaseCourse.route.js";
import courseProgressRoute from "./routes/courseProgress.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config({});

connectDB()
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
// app.use(cors())
app.use(cors({
    origin:"https://lms-frontend-weld.vercel.app/",
    // origin:"http://localhost:5173",
    credentials:true
}))

app.use("/api/v1/media",mediaRoute);
app.use("/api/v1/user",userRoute);
app.use("/api/v1/course",courseRoute);
app.use("/api/v1/purchase", purchaseRoute);
app.use("/api/v1/progress", courseProgressRoute);

app.get("/home",(req,res)=> {
    res.status(200).json({
        success:true,
        message: "Hello i am coming from backend"
    })
})

app.listen(PORT, ()=> {
    console.log(`Server is running at port ${PORT}`);
    
})
