export async function createPaymentForBooking({ provider, me, bookingId }) {
  switch (provider.toUpperCase()) {
    case 'MOMO': {
      const { createForBooking } = await import('./momo.service.js');
      return await createForBooking({ me, bookingId });
    }
    case 'ZALOPAY': {
      const { createForBooking } = await import('./zalopay.service.js');
      return await createForBooking({ me, bookingId });
    }
    case 'SEPAY': {
      const { createForBooking } = await import('./sepay.service.js');
      return await createForBooking({ me, bookingId });
    }
    default:
      throw new Error(`Unsupported payment provider: ${provider}`);
  }
}
