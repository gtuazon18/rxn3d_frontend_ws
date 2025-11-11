import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

// Base API slice with shared configuration
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    // Add credentials and headers as needed
    credentials: "same-origin",
    prepareHeaders: (headers) => {
      // Add any common headers here
      return headers
    },
  }),
  tagTypes: [
    "Stage",
    "Casespan",
    "TechnicianBilling",
    "LabAdmin",
    "Billing",
    "Products",
    "Stages",
    "Addons",
    "HistoryLog",
    "Staff",
    "Departments",
    "Grades",
    "Credits",
    "Transactions",
    "Notifications",
  ],
  endpoints: () => ({}),
})
