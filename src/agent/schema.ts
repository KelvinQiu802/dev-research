import { z } from "zod";

export const plannerResponseSchema = z.object({
    output: z.string().describe('Your reasoning process and the question you want to ask the user'),
    topic: z.string().describe('The topic after modification. Add a very short description to describe the topic.'),
    done: z.boolean().describe('Return true when the user has confirmed the final TOPIC, otherwise return false'),
});

