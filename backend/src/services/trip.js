import prisma from "../config/prismaClient.js";

export async function createTrip(userId, name) {
  return prisma.trip.create({
    data: {
      name,
      createdBy: userId,
      members: {
        create: {
          userId,
          role: "creator",
        },
      },
    },
    include: {
      members: {
        include: { user: true },
      },
    },
  });
}

export async function getTripsForUser(userId) {
  const membership = await prisma.tripMember.findMany({
    where: { userId },
    include: {
      trip: {
        include: {
          members: true, // Include members to get count
        },
      },
    },
  });

  return membership.map((m) => m.trip);
}

export async function getTripById(userId, tripId) {
  const membership = await prisma.tripMember.findFirst({
    where: { userId, tripId },
  });

  if (!membership) throw new Error("Access denied.");

  return prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      members: { include: { user: true } },
      expenses: true,
    },
  });
}

export async function updateTrip(userId, tripId, name) {
  const membership = await prisma.tripMember.findFirst({
    where: { userId, tripId },
  });

  if (!membership) throw new Error("Access denied.");

  return prisma.trip.update({
    where: { id: tripId },
    data: { name },
  });
}

export async function deleteTrip(userId, tripId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip || trip.createdBy !== userId)
    throw new Error("Only the creator can delete this trip.");

  await prisma.trip.delete({
    where: { id: tripId },
  });

  return { message: "Trip deleted." };
}
