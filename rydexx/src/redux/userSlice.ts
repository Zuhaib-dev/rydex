import { IUser } from "@/models/user.model";
import { createSlice } from "@reduxjs/toolkit";
interface IUserState {
  userData: IUser | null;
  adminUserData: IUser | null;
  isImpersonating: boolean;
}
const initialState: IUserState = {
  userData: null,
  adminUserData: null,
  isImpersonating: false,
};
export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    startImpersonation: (state, action) => {
      state.adminUserData = state.userData;
      state.userData = action.payload;
      state.isImpersonating = true;
    },
    stopImpersonation: (state) => {
      if (state.adminUserData) {
        state.userData = state.adminUserData;
      }
      state.adminUserData = null;
      state.isImpersonating = false;
    },
  },
});
export const { setUserData, startImpersonation, stopImpersonation } = userSlice.actions;
export default userSlice.reducer