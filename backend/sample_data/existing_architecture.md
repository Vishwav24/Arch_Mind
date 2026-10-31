# Existing Food Delivery Architecture

## Overview
Current system built 2 years ago, serving ~2000 concurrent users. Monolithic backend showing signs of strain.

## Components
- Web Frontend (React SPA on Nginx)
- Mobile App (React Native)
- API Gateway (Express.js, handles routing and rate limiting)
- User Service (handles authentication and profiles)
- Restaurant Service (manages restaurant listings and menus)
- Order Service (processes orders and payments)
- PostgreSQL Database (single instance, all services share it)
- Redis Cache (session storage and menu caching)

## Connections
- Web Frontend -> API Gateway (HTTPS/REST)
- Mobile App -> API Gateway (HTTPS/REST)
- API Gateway -> User Service (gRPC)
- API Gateway -> Restaurant Service (gRPC)
- API Gateway -> Order Service (gRPC)
- User Service -> PostgreSQL (TCP)
- Restaurant Service -> PostgreSQL (TCP)
- Order Service -> PostgreSQL (TCP)
- User Service -> Redis Cache (TCP)
- Restaurant Service -> Redis Cache (TCP)

## Known Issues
- Database is a single point of failure
- No real-time tracking capability
- Payment processing is tightly coupled to Order Service
- No message queue for async operations
- Search is basic SQL LIKE queries, very slow

