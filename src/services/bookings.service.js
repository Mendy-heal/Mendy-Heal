// services/bookings.service.js
import * as Bookings from "../repositories/bookings.repo.js";
import * as Users from "../repositories/users.repo.js";

const ALLOWED_CHANNELS = new Set(["CHAT", "AUDIO", "VIDEO"]);

export async function book({ me, expertId, startAt, endAt, channel = "CHAT" }) {
  // validate
  if (!expertId) throw Object.assign(new Error("expert_id is required"), { status: 400 });
  if (!startAt || !endAt) throw Object.assign(new Error("start_at and end_at are required"), { status: 400 });
  channel = String(channel || "CHAT").toUpperCase();
  if (!ALLOWED_CHANNELS.has(channel)) throw Object.assign(new Error("channel must be CHAT/AUDIO/VIDEO"), { status: 400 });
  if (Number(expertId) === Number(me)) throw Object.assign(new Error("Cannot book yourself"), { status: 400 });

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw Object.assign(new Error("Invalid datetime"), { status: 400 });
  if (end <= start) throw Object.assign(new Error("end_at must be after start_at"), { status: 400 });

  // business rules
  const withinAvail = await Bookings.isWithinAvailability(Number(expertId), start, end);
  if (!withinAvail) throw Object.assign(new Error("Expert not available in this time window"), { status: 409 });

  const overlap = await Bookings.hasOverlap(Number(expertId), start, end);
  if (overlap) throw Object.assign(new Error("Expert already booked in this time window"), { status: 409 });

  // price
  const price = await Bookings.getExpertPrice(Number(expertId));

  // create booking (MVP: auto CONFIRMED without payment)
  const bk = await Bookings.createBooking({
    userId: Number(me),
    expertId: Number(expertId),
    startAt: start,
    endAt: end,
    channel,
    price,
    status: "PENDING" // thay vì CONFIRMED
  });

  // KHÔNG tạo chat thread ngay
  return { booking: bk };


}

export async function listMine({ me, as }) {
  as = (as || "seeker").toLowerCase() === "expert" ? "expert" : "seeker";
  console.log(`[DEBUG] listMine called with me=${me}, as=${as}`);
  const result = await Bookings.listMine({ me, as });
  console.log(`[DEBUG] listMine result count: ${result.length}`);
  return result;
}

export async function confirm({ me, id }) {
  console.log(`[DEBUG] confirm service - Called with me=${me}, id=${id}`);
  const bk = await Bookings.getBookingById(Number(id));
  console.log(`[DEBUG] confirm service - Booking found:`, bk);
  if (!bk) {
    console.log(`[DEBUG] confirm service - Booking not found, throwing error`);
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }
  console.log(`[DEBUG] confirm service - Checking if user ${me} is expert ${bk.expert_id}`);
  // Fix: Compare as strings since both are strings from database and JWT
  if (bk.expert_id !== me.toString()) {
    console.log(`[DEBUG] confirm service - User is not the expert, throwing forbidden error`);
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (bk.status === "CONFIRMED") {
    console.log(`[DEBUG] confirm service - Booking already confirmed`);
    return bk;
  }
  console.log(`[DEBUG] confirm service - Updating status to CONFIRMED`);
  return Bookings.updateStatus({ id: bk.id, status: "CONFIRMED", byUser: me });
}

export async function cancel({ me, id }) {
  const bk = await Bookings.getBookingById(Number(id));
  if (!bk) throw Object.assign(new Error("Booking not found"), { status: 404 });
  // Fix: Compare as strings since both are strings from database and JWT
  if (![bk.user_id, bk.expert_id].includes(me.toString())) throw Object.assign(new Error("Forbidden"), { status: 403 });
  if (bk.status === "CANCELED") return bk;
  return Bookings.updateStatus({ id: bk.id, status: "CANCELED", byUser: me });
}

export async function complete({ me, id }) {
  const bk = await Bookings.getBookingById(Number(id));
  if (!bk) throw Object.assign(new Error("Booking not found"), { status: 404 });
  // Fix: Compare as strings since both are strings from database and JWT
  if (![bk.user_id, bk.expert_id].includes(me.toString())) throw Object.assign(new Error("Forbidden"), { status: 403 });
  if (bk.status !== "CONFIRMED") throw Object.assign(new Error("Only confirmed bookings can be completed"), { status: 400 });
  return Bookings.updateStatus({ id: bk.id, status: "COMPLETED", byUser: me });
}

// Auto-complete confirmed bookings that have passed their end time
export async function autoCompleteExpiredBookings() {
  const expiredBookings = await Bookings.getExpiredConfirmedBookings();
  const completedBookings = [];
  
  for (const booking of expiredBookings) {
    try {
      const completed = await Bookings.updateStatus({
        id: booking.id,
        status: "COMPLETED",
        byUser: "system"
      });
      completedBookings.push(completed);
      console.log(`Auto-completed booking ${booking.id} that ended at ${booking.end_at}`);
    } catch (error) {
      console.error(`Failed to auto-complete booking ${booking.id}:`, error);
    }
  }
  
  return completedBookings;
}
