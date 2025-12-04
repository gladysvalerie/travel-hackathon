import prisma from "../config/prismaClient.js";

async function ensureIsTripCreator(requesterId, tripId) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new Error("Trip not found");
  if (trip.createdBy !== requesterId)
    throw new Error("Only the creator can modify trip members");
}

export async function addMemberToTripByUsername(requesterId, tripId, username) {
  // validate trip + creator
  await ensureIsTripCreator(requesterId, tripId);

  // find user by username
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) throw new Error("User not found");

  // Check if user is already a member
  const existingMember = await prisma.tripMember.findUnique({
    where: {
      tripId_userId: {
        tripId,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    throw new Error("User is already a member of this trip");
  }

  // create membership
  return prisma.tripMember.create({
    data: {
      tripId,
      userId: user.id,
      role: "member",
    },
    include: {
      user: true,
    },
  });
}
