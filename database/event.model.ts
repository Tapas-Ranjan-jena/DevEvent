import { model, models, Schema, type Model } from 'mongoose';

export interface Event {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const containsOnlyNonEmptyStrings = (values: string[]): boolean =>
  values.length > 0 && values.every((value) => value.trim().length > 0);

const createSlug = (title: string): string => {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    throw new Error('Event title must contain characters that can form a slug.');
  }

  return slug;
};

const normalizeDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Event date must be a valid date.');
  }

  // Store calendar dates consistently without a time or timezone component.
  return date.toISOString().split('T')[0];
};

const normalizeTime = (value: string): string => {
  const time = value.trim();
  const twelveHourMatch = time.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*([ap]m)$/i);

  if (twelveHourMatch) {
    const [, hourValue, minute, period] = twelveHourMatch;
    let hour = Number(hourValue) % 12;

    if (period.toLowerCase() === 'pm') {
      hour += 12;
    }

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  const twentyFourHourMatch = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

  if (!twentyFourHourMatch) {
    throw new Error('Event time must use HH:mm or h:mm AM/PM format.');
  }

  return `${twentyFourHourMatch[1].padStart(2, '0')}:${twentyFourHourMatch[2]}`;
};

const eventSchema = new Schema<Event>(
  {
    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters.'],
    },
    slug: { type: String, lowercase: true, trim: true },
    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
    },
    overview: {
      type: String,
      required: [true, 'Overview is required.'],
      trim: true,
      maxlength: [500, 'Overview cannot exceed 500 characters.'],
    },
    image: {
      type: String,
      required: [true, 'Image URL is required.'],
      trim: true,
    },
    venue: {
      type: String,
      required: [true, 'Venue is required.'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required.'],
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required.'],
      trim: true,
    },
    time: {
      type: String,
      required: [true, 'Time is required.'],
      trim: true,
    },
    mode: {
      type: String,
      required: [true, 'Mode is required.'],
      lowercase: true,
      trim: true,
      enum: {
        values: ['online', 'offline', 'hybrid'],
        message: 'Mode must be online, offline, or hybrid.',
      },
    },
    audience: {
      type: String,
      required: [true, 'Audience is required.'],
      trim: true,
    },
    agenda: {
      type: [{ type: String, trim: true }],
      required: true,
      validate: {
        validator: containsOnlyNonEmptyStrings,
        message: 'Event agenda must contain at least one non-empty item.',
      },
    },
    organizer: {
      type: String,
      required: [true, 'Organizer is required.'],
      trim: true,
    },
    tags: {
      type: [{ type: String, trim: true }],
      required: true,
      validate: {
        validator: containsOnlyNonEmptyStrings,
        message: 'Event tags must contain at least one non-empty item.',
      },
    },
  },
  { timestamps: true },
);

eventSchema.index({ slug: 1 }, { unique: true });
eventSchema.index({ date: 1, mode: 1 });

eventSchema.pre('save', function () {
  // Regenerate the derived slug only when its source changes.
  if (this.isModified('title')) {
    this.slug = createSlug(this.title);
  }

  // Normalize temporal strings before persistence and reject invalid input.
  if (this.isModified('date')) {
    this.date = normalizeDate(this.date);
  }

  if (this.isModified('time')) {
    this.time = normalizeTime(this.time);
  }
});

export const Event: Model<Event> = models.Event
  ? (models.Event as Model<Event>)
  : model<Event>('Event', eventSchema);

export default Event;
