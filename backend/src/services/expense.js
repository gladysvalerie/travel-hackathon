import prisma from "../config/prismaClient.js";

// validate trip membership
async function ensureUserInTrip(userId, tripId) {
    const member = await prisma.tripMember.findFirst({
        where: { userId, tripId }
    });

    if (!member) {
        throw new Error("Access denied. User is not a member of this trip.");
    }
}

async function ensureUsersInTrip(usernames, tripId) {
    const users = await prisma.user.findMany({
      where: { username: { in: usernames } }
    });
  
    if (users.length !== usernames.length)
      throw new Error("Some provided usernames do not exist.");
  
    const memberRecords = await prisma.tripMember.findMany({
      where: {
        tripId,
        userId: { in: users.map(u => u.id) }
      }
    });
  
    if (memberRecords.length !== users.length)
      throw new Error("Some users are not members of this trip.");
  
    return users;
}

export async function createExpense(userId, tripId, description, amount, type, splitsInput, membersSelected) {
    await ensureUserInTrip(userId, tripId);
  
    // fetch all members
    const allMembers = await prisma.tripMember.findMany({
      where: { tripId },
      include: { user: true }
    });
  
    let finalSplits = [];
  
    if (type === "equal") {
      // equal among all
      const share = amount / allMembers.length;
      finalSplits = allMembers.map(m => ({
        userId: m.userId,
        shareAmount: share
      }));
    }
  
    else if (type === "equal_selected") {
      // equal among selected members only
      const users = await ensureUsersInTrip(membersSelected, tripId);
      const share = amount / users.length;
  
      finalSplits = users.map(u => ({
        userId: u.id,
        shareAmount: share
      }));
    }
  
    else if (type === "custom") {
      // arbitrary amounts per selected user
      const usernames = splitsInput.map(s => s.username);
      const users = await ensureUsersInTrip(usernames, tripId);
  
      finalSplits = splitsInput.map(s => {
        const user = users.find(u => u.username === s.username);
        return {
          userId: user.id,
          shareAmount: s.shareAmount
        };
      });
  
      const sum = finalSplits.reduce((acc, x) => acc + x.shareAmount, 0);
      if (Math.abs(sum - amount) > 0.0001)
        throw new Error("Split amounts must sum exactly to total expense.");
    }
  
    else {
        console.log(type)
      throw new Error("Invalid split type.");
    }
  
    return prisma.expense.create({
      data: {
        description,
        amount,
        tripId,
        paidBy: userId,
        splits: {
          create: finalSplits
        }
      },
      include: {
        splits: {
          include: { user: true }
        }
      }
    });
  }

export async function getExpensesForTrip(userId, tripId) {
  await ensureUserInTrip(userId, tripId);

  return prisma.expense.findMany({
    where: { tripId },
    include: {
      payer: true,
      splits: { include: { user: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getExpenseById(userId, expenseId) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      payer: true,
      splits: { include: { user: true } }
    }
  });

  if (!expense) throw new Error("Expense not found.");

  await ensureUserInTrip(userId, expense.tripId);

  return expense;
}

export async function updateExpense(userId, expenseId, description, amount, type, splitsInput, membersSelected) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { splits: { include: { user: true } } }
  });

  if (!expense) throw new Error("Expense not found.");

  // Only payer can update
  if (expense.paidBy !== userId)
    throw new Error("Only the payer can update this expense.");

  await ensureUserInTrip(userId, expense.tripId);

  // fetch all members
  const allMembers = await prisma.tripMember.findMany({
    where: { tripId: expense.tripId },
    include: { user: true }
  });

  let finalSplits = [];

  if (type === "equal") {
    // equal among all
    const share = amount / allMembers.length;
    finalSplits = allMembers.map(m => ({
      userId: m.userId,
      shareAmount: share
    }));
  }

  else if (type === "equal_selected") {
    // equal among selected members only
    const users = await ensureUsersInTrip(membersSelected, expense.tripId);
    const share = amount / users.length;

    finalSplits = users.map(u => ({
      userId: u.id,
      shareAmount: share
    }));
  }

  else if (type === "custom") {
    // arbitrary amounts per selected user
    const usernames = splitsInput.map(s => s.username);
    const users = await ensureUsersInTrip(usernames, expense.tripId);

    finalSplits = splitsInput.map(s => {
      const user = users.find(u => u.username === s.username);
      return {
        userId: user.id,
        shareAmount: s.shareAmount
      };
    });

    const sum = finalSplits.reduce((acc, x) => acc + x.shareAmount, 0);
    if (Math.abs(sum - amount) > 0.0001)
      throw new Error("Split amounts must sum exactly to total expense.");
  }

  else {
    throw new Error("Invalid split type.");
  }

  // Update expense + replace all splits
  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      description,
      amount,
      splits: {
        deleteMany: {}, // remove old splits
        create: finalSplits
      }
    },
    include: {
      splits: {
        include: { user: true }
      }
    }
  });
}

export async function deleteExpense(userId, expenseId) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId }
  });

  if (!expense) throw new Error("Expense not found.");

  // Only payer can delete
  if (expense.paidBy !== userId)
    throw new Error("Only the payer can delete this expense.");

  await prisma.expense.delete({ where: { id: expenseId } });

  return { message: "Expense deleted." };
}
