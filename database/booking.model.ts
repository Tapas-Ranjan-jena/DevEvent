import { model, models, Schema, Types, type Model } from 'mongoose';

import { Event } from './event.model';

export interface Booking {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const bookingSchema = new Schema<Booking>(
  {
    // Keep the reference typed and indexed for event-scoped booking queries.
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      trim: true,
      lowercase: true,
      validate: {
        validator: (email: string): boolean => EMAIL_PATTERN.test(email),
        message: 'Please provide a valid email address.',
      },
    },
  },
  { timestamps: true },
);

bookingSchema.index({ eventId: 1 });
bookingSchema.index({ eventId: 1, createdAt: -1 });
bookingSchema.index({ email: 1 });
bookingSchema.index(
  { eventId: 1, email: 1 },
  { unique: true, name: 'uniq_event_email' },
);

bookingSchema.pre('save', async function () {
  // Prevent bookings from retaining references to events that do not exist.
  if (this.isNew || this.isModified('eventId')) {
    let eventExists: { _id: Types.ObjectId } | null;

    try {
      eventExists = await Event.exists({ _id: this.eventId });
    } catch {
      const error = new Error('Invalid event ID format or database error.');
      error.name = 'ValidationError';
      throw error;
    }

    if (!eventExists) {
      const error = new Error(`Event with ID ${this.eventId.toString()} does not exist.`);
      error.name = 'ValidationError';
      throw error;
    }
  }
});

export const Booking: Model<Booking> = models.Booking
  ? (models.Booking as Model<Booking>)
  : model<Booking>('Booking', bookingSchema);

export default Booking;
