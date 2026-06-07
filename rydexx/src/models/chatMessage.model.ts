import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
{
 rideId:{
  type:mongoose.Schema.Types.ObjectId,
  required:true
 },

 sender:{
  type:String,
  enum:["user","driver"],
  required:true
 },

 text:{
  type:String,
  required:true
 },

 status:{
  type:String,
  enum:["sent","delivered","read"],
  default:"sent",
  required:true
 }

},
{timestamps:true}
);

const ChatMessage= mongoose.models.ChatMessage ||
mongoose.model("ChatMessage",ChatMessageSchema);

export default ChatMessage