"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, Prisma, Role } from "@monkeyprint/db";
import { jwtVerify, SignJWT } from "jose";
import { hashPassword } from "@monkeyprint/utils/hash";
import type {
  ActionResult,
  AuthUser,
  CreateAdminInput,
  GetAdminsOptions,
  PaginatedActionResult,
  SerializedAdmin,
  TeamManagedRole,
  UpdateAdminInput,
} from "@/types";


const COOKIE_NAME = "authToken";
const MIN_PASSWORD_LENGTH = 8;
const ADMIN_REVALIDATION_PATHS = ["/dashboard/team", "/dashboard"] as const;

const ADMIN_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phoneNumber: true,
  address: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type AdminRecord = Prisma.UserGetPayload<{
  select: typeof ADMIN_SELECT;
}>;

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
};

function serializeAdmin(admin: AdminRecord): SerializedAdmin {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role === Role.SUPER_ADMIN ? "SUPER_ADMIN" : "ADMIN",
    phoneNumber: admin.phoneNumber,
    address: admin.address,
    createdAt: admin.createdAt.toISOString(),
    updatedAt: admin.updatedAt.toISOString(),
  };
}

function sanitizeLimit(value: number | undefined, fallback = 50, max = 200): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), 1), max);
}

function sanitizeOffset(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(Math.trunc(value), 0);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isTeamManagedRole(value: unknown): value is TeamManagedRole {
  return value === "ADMIN" || value === "SUPER_ADMIN";
}

function toRoleEnum(role: TeamManagedRole): Role {
  return role === "SUPER_ADMIN" ? Role.SUPER_ADMIN : Role.ADMIN;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function revalidateAdminPaths() {
  for (const path of ADMIN_REVALIDATION_PATHS) {
    revalidatePath(path);
  }
}

async function requireSuperAdmin(): Promise<AuthUser | null> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== Role.SUPER_ADMIN) {
    return null;
  }

  return currentUser;
}

async function countActiveSuperAdmins(): Promise<number> {
  return db.user.count({
    where: {
      role: Role.SUPER_ADMIN,
      isDeleted: false,
    },
  });
}

async function restoreSoftDeletedUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: TeamManagedRole;
  phoneNumber: string | null;
  address: string | null;
}): Promise<SerializedAdmin | null> {
  const restored = await db.user.updateMany({
    where: {
      email: input.email,
      isDeleted: true,
    },
    data: {
      name: input.name,
      email: input.email,
      password: input.passwordHash,
      role: toRoleEnum(input.role),
      phoneNumber: input.phoneNumber,
      address: input.address,
      userType: null,
      isDeleted: false,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  if (restored.count === 0) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { email: input.email },
    select: ADMIN_SELECT,
  });

  if (!user) {
    return null;
  }

  return serializeAdmin(user);
}

/**
 * Get the currently authenticated user from the JWT cookie.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // ✅ 1. Keep await (your Next.js version requires it)
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    // ✅ 2. Only risky logic inside try
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);

    const userId = (payload.id || payload.userId) as string;

    if (!userId) {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        phoneNumber: true,
        address: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      userType: user.userType,
      phoneNumber: user.phoneNumber,
      address: user.address,
    };
  } catch (error: any) {
    // ✅ 3. Critical fix: don't swallow Next.js dynamic errors
    if (error?.digest === "DYNAMIC_SERVER_USAGE") {
      throw error;
    }

    console.error("Auth error:", error);
    return null;
  }
}

/**
 * Refresh the JWT token with a new expiration.
 */
export async function refreshToken(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);

    const user: AuthUser = {
      id: (payload.id || payload.userId) as string,
      email: payload.email as string,
      role: payload.role as AuthUser["role"],
      userType: payload.userType as AuthUser["userType"],
      name: payload.name as string,
      phoneNumber: (payload.phoneNumber as string | null | undefined) ?? null,
      address: (payload.address as string | null | undefined) ?? null,
    };

    const newToken = await new SignJWT({ ...user })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    cookieStore.set({
      name: COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return user;
  } catch (error) {
    console.error("Token refresh failed:", error);
    cookieStore.delete(COOKIE_NAME);
    return null;
  }
}

/**
 * Sign out the current user.
 */
export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Super admin: list admin and super admin accounts.
 */
export async function getAdmins(
  options: GetAdminsOptions = {},
): Promise<PaginatedActionResult<SerializedAdmin[]>> {
  const currentUser = await requireSuperAdmin();

  if (!currentUser) {
    return {
      success: false,
      data: [],
      total: 0,
      error: "Unauthorized. Super admin access is required.",
    };
  }

  try {
    const limit = sanitizeLimit(options.limit, 50, 500);
    const offset = sanitizeOffset(options.offset);
    const search = options.search?.trim();

    const where: Prisma.UserWhereInput = {
      isDeleted: false,
      role: {
        in: [Role.ADMIN, Role.SUPER_ADMIN],
      },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [admins, total] = await Promise.all([
      db.user.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.user.count({ where }),
    ]);

    return {
      success: true,
      data: admins.map(serializeAdmin),
      total,
    };
  } catch (error) {
    console.error("Error fetching admins:", error);
    return {
      success: false,
      data: [],
      total: 0,
      error: "Failed to fetch users",
    };
  }
}

/**
 * Super admin: create a new admin/super admin account.
 * If a soft-deleted account with the same email exists, it is restored.
 */
export async function createAdmin(
  input: CreateAdminInput,
): Promise<ActionResult<SerializedAdmin>> {
  const currentUser = await requireSuperAdmin();

  if (!currentUser) {
    return {
      success: false,
      error: "Unauthorized. Super admin access is required.",
    };
  }

  try {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim();
    const role: TeamManagedRole = input.role ?? "ADMIN";
    const phoneNumber = input.phoneNumber?.trim() || null;
    const address = input.address?.trim() || null;

    if (name.length < 2) {
      return { success: false, error: "Name must be at least 2 characters." };
    }

    if (!isValidEmail(email)) {
      return { success: false, error: "Please provide a valid email address." };
    }

    if (!isTeamManagedRole(role)) {
      return { success: false, error: "Invalid role selected." };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        success: false,
        error: "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.",
      };
    }

    const existingActiveUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingActiveUser) {
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }

    const passwordHash = await hashPassword(password);

    try {
      const created = await db.user.create({
        data: {
          name,
          email,
          password: passwordHash,
          role: toRoleEnum(role),
          phoneNumber,
          address,
          userType: null,
        },
        select: ADMIN_SELECT,
      });

      revalidateAdminPaths();

      return {
        success: true,
        data: serializeAdmin(created),
      };
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const restored = await restoreSoftDeletedUser({
        name,
        email,
        passwordHash,
        role,
        phoneNumber,
        address,
      });

      if (restored) {
        revalidateAdminPaths();
        return {
          success: true,
          data: restored,
        };
      }

      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create user account."),
    };
  }
}

/**
 * Super admin: update an admin/super admin account.
 */
export async function updateAdmin(
  input: UpdateAdminInput,
): Promise<ActionResult<SerializedAdmin>> {
  const currentUser = await requireSuperAdmin();

  if (!currentUser) {
    return {
      success: false,
      error: "Unauthorized. Super admin access is required.",
    };
  }

  try {
    const normalizedId = input.id?.trim();

    if (!normalizedId) {
      return { success: false, error: "User id is required." };
    }

    const targetAdmin = await db.user.findFirst({
      where: {
        id: normalizedId,
        role: { in: [Role.ADMIN, Role.SUPER_ADMIN] },
      },
      select: { id: true, email: true, role: true },
    });

    if (!targetAdmin) {
      return { success: false, error: "User account not found." };
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (input.name !== undefined) {
      const normalizedName = input.name.trim();
      if (normalizedName.length < 2) {
        return { success: false, error: "Name must be at least 2 characters." };
      }
      updateData.name = normalizedName;
    }

    if (input.email !== undefined) {
      const normalizedEmail = input.email.trim().toLowerCase();

      if (!isValidEmail(normalizedEmail)) {
        return { success: false, error: "Please provide a valid email address." };
      }

      if (normalizedEmail !== targetAdmin.email) {
        const existingActiveUser = await db.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });

        if (existingActiveUser && existingActiveUser.id !== targetAdmin.id) {
          return {
            success: false,
            error: "An account with this email already exists.",
          };
        }
      }

      updateData.email = normalizedEmail;
    }

    if (input.role !== undefined) {
      if (!isTeamManagedRole(input.role)) {
        return { success: false, error: "Invalid role selected." };
      }

      const nextRole = toRoleEnum(input.role);

      if (targetAdmin.id === currentUser.id && nextRole !== Role.SUPER_ADMIN) {
        return {
          success: false,
          error: "You cannot demote your own super admin account.",
        };
      }

      if (targetAdmin.role === Role.SUPER_ADMIN && nextRole === Role.ADMIN) {
        const superAdminCount = await countActiveSuperAdmins();

        if (superAdminCount <= 1) {
          return {
            success: false,
            error: "At least one super admin must remain in the system.",
          };
        }
      }

      updateData.role = nextRole;
    }

    if (input.phoneNumber !== undefined) {
      updateData.phoneNumber = input.phoneNumber.trim() || null;
    }

    if (input.address !== undefined) {
      updateData.address = input.address.trim() || null;
    }

    if (input.password !== undefined) {
      const normalizedPassword = input.password.trim();

      if (
        normalizedPassword.length > 0 &&
        normalizedPassword.length < MIN_PASSWORD_LENGTH
      ) {
        return {
          success: false,
          error: "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.",
        };
      }

      if (normalizedPassword.length >= MIN_PASSWORD_LENGTH) {
        updateData.password = await hashPassword(normalizedPassword);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "No changes were submitted." };
    }

    const updated = await db.user.update({
      where: { id: targetAdmin.id },
      data: updateData,
      select: ADMIN_SELECT,
    });

    revalidateAdminPaths();

    return {
      success: true,
      data: serializeAdmin(updated),
    };
  } catch (error) {
    console.error("Error updating user:", error);

    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: "This email is already in use by an existing or deleted account.",
      };
    }

    return {
      success: false,
      error: getErrorMessage(error, "Failed to update user account."),
    };
  }
}

/**
 * Super admin: permanently delete an admin/super admin account.
 */
export async function deleteAdmin(id: string): Promise<ActionResult> {
  const currentUser = await requireSuperAdmin();

  if (!currentUser) {
    return {
      success: false,
      error: "Unauthorized. Super admin access is required.",
    };
  }

  try {
    const normalizedId = id.trim();

    if (!normalizedId) {
      return { success: false, error: "User id is required." };
    }

    const targetAdmin = await db.user.findFirst({
      where: {
        id: normalizedId,
        role: { in: [Role.ADMIN, Role.SUPER_ADMIN] },
      },
      select: { id: true, role: true },
    });

    if (!targetAdmin) {
      return { success: false, error: "User account not found." };
    }

    if (targetAdmin.id === currentUser.id) {
      return { success: false, error: "You cannot delete your own account." };
    }

    if (targetAdmin.role === Role.SUPER_ADMIN) {
      const superAdminCount = await countActiveSuperAdmins();

      if (superAdminCount <= 1) {
        return {
          success: false,
          error: "At least one super admin must remain in the system.",
        };
      }
    }

    await db.user.delete({
      where: { id: targetAdmin.id },
    });

    revalidateAdminPaths();

    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete user account."),
    };
  }
}
