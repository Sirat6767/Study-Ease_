const { z } = require('zod');

const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    return next();
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      details: error.errors
    });
  }
};

// Common schemas
const schemas = {
  course: z.object({
    body: z.object({
      courseCode: z.string().min(1, "Course code is required"),
      courseName: z.string().min(1, "Course name is required"),
      creditHours: z.union([z.string(), z.number()]).transform(val => parseFloat(val)).refine(val => val > 0 && val <= 6, "Credit hours must be between 0.5 and 6")
    })
  }),
  exam: z.object({
    body: z.object({
      courseId: z.union([z.string(), z.number()]),
      name: z.string().min(1, "Exam name is required"),
      date: z.string().min(1, "Date is required"),
      time: z.string().optional().nullable(),
      venue: z.string().optional().nullable(),
      notes: z.string().optional().nullable()
    })
  }),
  notice: z.object({
    body: z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
      category: z.enum(['general', 'academic', 'event', 'urgent']).default('general'),
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
      isPinned: z.boolean().default(false)
    })
  }),
  task: z.object({
    body: z.object({
      name: z.string().min(1, "Task name is required"),
      priority: z.enum(['low', 'normal', 'high']).default('normal'),
      dueDate: z.string().optional().nullable()
    })
  })
};

module.exports = { validate, schemas };
