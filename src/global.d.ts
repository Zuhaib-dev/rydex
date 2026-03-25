import { Connection } from "mongoose";

declare global{
   var  mongoseConn:{
        conn:Connection | null,
        promise:Promise<Connection> |null
    }
}
export {}