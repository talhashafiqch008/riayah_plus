import { client } from "./client";
import { extractApiError } from '@/lib/errors';
import type {
    CoursePayload,
    QuizPayload,
} from "@/types/api";

// export async function getCourses() {
//     try {
//         const response = await client.get('/courses');
//         return response.data;
//     } catch (error) {
//         console.error('Failed to fetch courses', error);
//         throw extractApiError(error);
//     }
// }

// export async function getCourseById(id: string) {
//     try {
//         const response = await client.get(`/courses/${id}`);
//         return response.data;
//     } catch (error) {
//         console.error(`Failed to fetch course ${id}`, error);
//         throw extractApiError(error);
//     }
// }

// export async function enrollInCourse(id: string) {
//     try {
//         const response = await client.post(`/courses/${id}/enroll`);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to enrollInCourse', error);
//         throw extractApiError(error);
//     }
// }

// export async function completeLesson(courseId: string, lessonId: string) {
//     try {
//         const response = await client.post(`/courses/${courseId}/lessons/${lessonId}/complete`);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to completeLesson', error);
//         throw extractApiError(error);
//     }
// }

export async function getMyCertificates() {
    try {
        const response = await client.get('/certificates');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch certificates', error);
        throw extractApiError(error);
    }
}

export async function getTrainerCourses() {
    try {
        const response = await client.get('/trainer/courses');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch trainer courses', error);
        throw extractApiError(error);
    }
}

export async function createCourse(data: CoursePayload) {
    try {
        const response = await client.post('/trainer/courses', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create course', error);
        throw extractApiError(error);
    }
}

// export async function updateCourse(id: string, data: CoursePayload) {
//     try {
//         const response = await client.put(`/trainer/courses/${id}`, data);
//         return response.data;
//     } catch (error) {
//         console.error(`Failed to update course ${id}`, error);
//         throw extractApiError(error);
//     }
// }

export async function deleteCourse(id: string) {
    try {
        const response = await client.delete(`/trainer/courses/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to delete course ${id}`, error);
        throw extractApiError(error);
    }
}

export async function getTrainerStudents() {
    try {
        const response = await client.get('/trainer/students');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch trainer students', error);
        throw extractApiError(error);
    }
}

export async function getTrainerQuizzes() {
    try {
        const response = await client.get('/trainer/quizzes');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch trainer quizzes', error);
        throw extractApiError(error);
    }
}

export async function createQuiz(data: QuizPayload) {
    try {
        const response = await client.post('/trainer/quizzes', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create quiz', error);
        throw extractApiError(error);
    }
}

// export async function updateQuiz(id: string, data: QuizPayload) {
//     try {
//         const response = await client.put(`/trainer/quizzes/${id}`, data);
//         return response.data;
//     } catch (error) {
//         console.error(`Failed to update quiz ${id}`, error);
//         throw extractApiError(error);
//     }
// }

export async function deleteQuiz(id: string) {
    try {
        const response = await client.delete(`/trainer/quizzes/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to delete quiz ${id}`, error);
        throw extractApiError(error);
    }
}

export async function getTrainerAnalytics() {
    try {
        const response = await client.get('/trainer/analytics');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch trainer analytics', error);
        throw extractApiError(error);
    }
}
