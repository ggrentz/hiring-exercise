import * as Hapi from "@hapi/hapi";
import { Login } from "responses/responses";
import { User } from "models/user";
import Token from "../auth/token";
import UserRepository from "../repositories/UserRepository";
import AuthController from "../controllers/AuthController";
import { Credentials } from "auth/auth";

class UserController {
  private static validateAccess(
    credentials: Credentials,
    user: User
  ): never | void {
    return;
  }

  public async delete(request, h): Promise<Hapi.ServerResponse> {
    try {
      const credentials: Credentials = request.auth.credentials;

      const userId: string = request.params.userId;
      const user: User = await UserRepository.getById(userId);

      UserController.validateAccess(credentials, user);

      await UserRepository.deleteById(userId);

      return h.response(user).takeover();
    } catch (error) {
      return h
        .response({ status: "error", error: error.message })
        .code(403)
        .takeover();
    }
  }

  public async update(request, h): Promise<Hapi.ServerResponse> {
    try {
      const credentials: Credentials = request.auth.credentials;
      const update: User = request.payload;

      const userId: string = request.params.userId;
      const user: User = await UserRepository.getById(userId);

      UserController.validateAccess(credentials, user);

      const updated: User = await UserRepository.update(update, userId);

      return h.response(updated);
    } catch (error) {
      return h
        .response({ status: "error", error: error.message })
        .code(403)
        .takeover();
    }
  }

  public async get(request, h): Promise<Hapi.ServerResponse> {
    try {
      const credentials: Credentials = request.auth.credentials;

      const userId: string = request.params.userId;
      const user: User = await UserRepository.getById(userId);

      UserController.validateAccess(credentials, user);

      user.password = undefined; // todo: doesn't seem to work

      return h.response(user);
    } catch (error) {
      return h
        .response({ status: "error", error: error.message })
        .code(403)
        .takeover();
    }
  }

  public async create(request, h): Promise<Hapi.ServerResponse> {
    try {
      const payload: User = request.payload;
      const exists: boolean = await UserRepository.doesExist(payload);
      if (exists) {
        throw new Error("A user already exists with that email.");
      }
      const user: User = await UserRepository.create(payload);
      const token = Token.create(user);

      user.password = undefined;

      const response: Login = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        auth_token: token,
        user
      };

      return h.response(response);
    } catch (error) {
      return h
        .response({ status: "error", error: error.message })
        .code(400)
        .takeover();
    }
  }

  public async list(request, h): Promise<Hapi.ServerResponse> {
    try {
      const users: Array<User> = await UserRepository.list();

      return h.response(users);
    } catch (error) {
      return h
        .response({ status: "error", error: error?.message || error })
        .code(400)
        .takeover();
    }
  }

  public async changePassword(request, h): Promise<Hapi.ServerResponse> {
    try {
      const credentials: Credentials = request.auth.credentials;
      const {
        userId,
        currentPassword,
        newPassword,
        newPasswordConfirm
      } = request.payload;

      const user: User = await UserRepository.getById(userId);

      // TODO: would probably make sense to make sure the user is an admin before changing other's passwords...
      UserController.validateAccess(credentials, user);

      const passwordsMatch = await AuthController.verifyPassword(
        currentPassword,
        user.password
      );
      if (!passwordsMatch) {
        throw new Error("Incorrect Password!");
      }
      if (newPassword !== newPasswordConfirm) {
        throw new Error("Passwords Must Match!");
      }

      user.password = newPassword;
      const updated: User = await UserRepository.changePassword(user, user._id);

      return h.response(updated);
    } catch (error) {
      return h
        .response({ status: "error", error: error.message })
        .code(403)
        .takeover();
    }
  }
}

export default new UserController();
