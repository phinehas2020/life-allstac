//
//  NetworkRetry.swift
//  LifeApp
//
//  Network retry with exponential backoff
//

import Foundation

struct RetryPolicy {
    let maxRetries: Int
    let baseDelay: TimeInterval
    let maxDelay: TimeInterval
    let exponentialMultiplier: Double
    
    static let `default` = RetryPolicy(
        maxRetries: 3,
        baseDelay: 1.0,
        maxDelay: 30.0,
        exponentialMultiplier: 2.0
    )
    
    static let aggressive = RetryPolicy(
        maxRetries: 5,
        baseDelay: 0.5,
        maxDelay: 15.0,
        exponentialMultiplier: 1.5
    )
    
    func delay(for retryAttempt: Int) -> TimeInterval {
        let exponentialDelay = baseDelay * pow(exponentialMultiplier, Double(retryAttempt))
        return min(exponentialDelay, maxDelay)
    }
    
    func shouldRetry(attempt: Int, error: Error) -> Bool {
        guard attempt < maxRetries else { return false }
        
        // Don't retry on certain errors
        if let urlError = error as? URLError {
            switch urlError.code {
            case .timedOut, .networkConnectionLost, .notConnectedToInternet, .dataNotAllowed:
                return true
            case .badURL, .unsupportedURL, .cannotFindHost:
                return false
            default:
                break
            }
        }
        
        // Retry on 5xx server errors
        if let httpResponse = error.httpStatusCode {
            return (500...599).contains(httpResponse)
        }
        
        // Default to retry
        return true
    }
}

extension Error {
    var httpStatusCode: Int? {
        guard let urlError = self as? URLError,
              let httpResponse = urlError.userInfo[NSURLErrorFailingURLResponseErrorKey] as? HTTPURLResponse else {
            return nil
        }
        return httpResponse.statusCode
    }
}

class NetworkRetryManager {
    static func execute<T>(
        policy: RetryPolicy = .default,
        operation: @escaping () async throws -> T
    ) async throws -> T {
        var lastError: Error?
        
        for attempt in 0..<policy.maxRetries {
            do {
                return try await operation()
            } catch {
                lastError = error
                
                // Check if we should retry
                guard policy.shouldRetry(attempt: attempt, error: error) else {
                    throw error
                }
                
                // Calculate delay and wait
                let delay = policy.delay(for: attempt)
                
                #if DEBUG
                print("🔄 [Retry] Attempt \(attempt + 1) failed after \(delay)s delay: \(error.localizedDescription)")
                #endif
                
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }
        
        throw lastError ?? NSError(domain: "NetworkRetry", code: -1, userInfo: [NSLocalizedDescriptionKey: "Max retries exceeded"])
    }
    
    static func executeWithProgress<T>(
        policy: RetryPolicy = .default,
        onRetry: ((Int, Error) async -> Void)? = nil,
        operation: @escaping () async throws -> T
    ) async throws -> T {
        var lastError: Error?
        
        for attempt in 0..<policy.maxRetries {
            do {
                return try await operation()
            } catch {
                lastError = error
                
                guard policy.shouldRetry(attempt: attempt, error: error) else {
                    throw error
                }
                
                await onRetry?(attempt, error)
                
                let delay = policy.delay(for: attempt)
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }
        
        throw lastError ?? NSError(domain: "NetworkRetry", code: -1, userInfo: [NSLocalizedDescriptionKey: "Max retries exceeded"])
    }
}
