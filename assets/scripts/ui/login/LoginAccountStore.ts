import { STORAGE_KEYS, storage } from "../../core/storage";
import type { AuthUser, UserRole } from "../../types/api";

// 文件整体作用：
// 这是登录页的“最近一次账号记录器”。
// 它会把最后一次成功登录的账号和身份存到本地，方便下次打开登录页时直接展示默认账号。
//
// 一句话版本：
// 这段代码的核心意思就是：把最近一次成功登录的账号记下来，下次打开登录页时可以直接显示。
//
// 美术需要关注的重点：
// 1. 这里不控制任何按钮样式，只控制“默认账号条里显示谁”。
// 2. 如果默认账号显示不对，通常要从这里和 loginAccountStore 的写入时机查。
export type LoginSavedAccount = {
  // username：最近一次记住的账号名。
  // role：这个账号对应的是学生还是家长。
  username: string;
  role: UserRole;
};

class LoginAccountStore {
  getDefaultAccount(): LoginSavedAccount | null {
    // 从本地存储里取出最近一次记住的账号。
    return storage.getJson<LoginSavedAccount>(STORAGE_KEYS.lastAccount);
  }

  rememberAccount(user: Pick<AuthUser, "username" | "role">): void {
    // 登录或注册成功后，把账号信息记下来，供下次打开登录页直接展示。
    storage.setJson(STORAGE_KEYS.lastAccount, {
      username: user.username,
      role: user.role,
    } satisfies LoginSavedAccount);
  }
}

export const loginAccountStore = new LoginAccountStore();
