import prisma from "../config/prismaClient.js";

// validate trip membership
async function ensureUserInTrip(userId, tripId) {
  const member = await prisma.tripMember.findFirst({
    where: { userId, tripId },
  });

  if (!member) {
    throw new Error("Access denied. User is not a member of this trip.");
  }
}

async function ensureUsersInTrip(usernames, tripId) {
  const users = await prisma.user.findMany({
    where: { username: { in: usernames } },
  });

  if (users.length !== usernames.length)
    throw new Error("Some provided usernames do not exist.");

  const memberRecords = await prisma.tripMember.findMany({
    where: {
      tripId,
      userId: { in: users.map((u) => u.id) },
    },
  });

  if (memberRecords.length !== users.length)
    throw new Error("Some users are not members of this trip.");

  return users;
}

export async function createExpense(
  userId,
  tripId,
  description,
  amount,
  type,
  splitsInput,
  membersSelected
) {
  await ensureUserInTrip(userId, tripId);

  // fetch all members
  const allMembers = await prisma.tripMember.findMany({
    where: { tripId },
    include: { user: true },
  });

  let finalSplits = [];

  // CRITICAL: Normalize type - ALWAYS default to "equal" if not provided or invalid
  // Handle ALL edge cases: null, undefined, empty string, whitespace, invalid values, etc.
  let splitType = "equal"; // ALWAYS start with default

  // Only process if type is actually provided and not empty
  if (type != null && type !== "" && String(type).trim() !== "") {
    const normalized = String(type).trim().toLowerCase();
    // Only accept valid types, otherwise use default
    if (
      normalized === "equal" ||
      normalized === "equal_selected" ||
      normalized === "custom"
    ) {
      splitType = normalized;
    } else {
      // Invalid type provided - use default
      console.warn(
        `Service - Invalid split type '${type}', defaulting to 'equal'`
      );
      splitType = "equal";
    }
  }

  console.log("Service - Type processing (FINAL):", {
    received: type,
    finalType: splitType,
    typeOf: typeof type,
    willUse: splitType,
  });

  // CRITICAL: splitType is now GUARANTEED to be one of: "equal", "equal_selected", or "custom"
  // Final safety check - if somehow splitType is not valid, force it to "equal"
  if (
    splitType !== "equal" &&
    splitType !== "equal_selected" &&
    splitType !== "custom"
  ) {
    console.error(
      `Service - CRITICAL: splitType is invalid: '${splitType}', forcing to 'equal'`
    );
    splitType = "equal";
  }

  if (splitType === "equal") {
    // equal among all
    const share = amount / allMembers.length;
    finalSplits = allMembers.map((m) => ({
      userId: m.userId,
      shareAmount: share,
    }));
  } else if (splitType === "equal_selected") {
    // equal among selected members only
    if (!membersSelected || membersSelected.length === 0) {
      throw new Error(
        "Members must be provided for equal_selected split type."
      );
    }
    const users = await ensureUsersInTrip(membersSelected, tripId);
    const share = amount / users.length;

    finalSplits = users.map((u) => ({
      userId: u.id,
      shareAmount: share,
    }));
  } else if (splitType === "custom") {
    // arbitrary amounts per selected user
    if (!splitsInput || splitsInput.length === 0) {
      throw new Error("Splits must be provided for custom split type.");
    }
    const usernames = splitsInput.map((s) => s.username);
    const users = await ensureUsersInTrip(usernames, tripId);

    finalSplits = splitsInput.map((s) => {
      const user = users.find((u) => u.username === s.username);
      return {
        userId: user.id,
        shareAmount: s.shareAmount,
      };
    });

    const sum = finalSplits.reduce((acc, x) => acc + x.shareAmount, 0);
    if (Math.abs(sum - amount) > 0.0001)
      throw new Error("Split amounts must sum exactly to total expense.");
  }

  // NOTE: No else block needed - splitType is guaranteed to be one of the three values above

  // Validate we have splits before creating expense
  if (!finalSplits || finalSplits.length === 0) {
    throw new Error(
      "Failed to create expense splits. No members found in trip."
    );
  }

  console.log("Service - Creating expense with splits:", {
    description,
    amount,
    splitType,
    splitsCount: finalSplits.length,
    finalSplits: finalSplits,
  });

  try {
    // Create expense with nested ExpenseSplit records
    // Prisma will automatically create the ExpenseSplit records via the relation
    const expense = await prisma.expense.create({
      data: {
        description,
        amount,
        tripId,
        paidBy: userId,
        splits: {
          create: finalSplits,
        },
      },
      include: {
        splits: {
          include: { user: true },
        },
      },
    });

    console.log("Service - Expense created successfully:", expense.id);
    return expense;
  } catch (error) {
    console.error("Service - Error creating expense:", error);
    console.error("Service - Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    throw error;
  }
}

export async function getExpensesForTrip(userId, tripId) {
  await ensureUserInTrip(userId, tripId);

  return prisma.expense.findMany({
    where: { tripId },
    include: {
      payer: true,
      splits: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getExpenseById(userId, expenseId) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      payer: true,
      splits: { include: { user: true } },
    },
  });

  if (!expense) throw new Error("Expense not found.");

  await ensureUserInTrip(userId, expense.tripId);

  return expense;
}

export async function updateExpense(userId, expenseId, description, amount) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense) throw new Error("Expense not found.");

  // Only payer can update
  if (expense.paidBy !== userId)
    throw new Error("Only the payer can update this expense.");

  // Recalculate shares for all members
  const members = await prisma.tripMember.findMany({
    where: { tripId: expense.tripId },
  });

  const share = amount / members.length;

  // Update expense + replace all splits
  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      description,
      amount,
      splits: {
        deleteMany: {}, // remove old splits
        create: members.map((m) => ({
          userId: m.userId,
          shareAmount: share,
        })),
      },
    },
    include: { splits: true },
  });
}

export async function deleteExpense(userId, expenseId) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense) throw new Error("Expense not found.");

  // Only payer can delete
  if (expense.paidBy !== userId)
    throw new Error("Only the payer can delete this expense.");

  await prisma.expense.delete({ where: { id: expenseId } });

  return { message: "Expense deleted." };
}
