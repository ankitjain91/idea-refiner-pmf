/**
 * API Interceptor - Automatically tracks all Supabase function invocations
 */
import { apiCallAnalyzer } from './api-call-analyzer';

// Store the original invoke method
let originalInvoke: any = null;
let isIntercepting = false;

/**
 * Install the API interceptor to automatically track all Supabase function calls
 */
export function installAPIInterceptor(supabaseClient: any) {
  if (isIntercepting || !supabaseClient?.functions?.invoke) {
    return;
  }

  // Store original method
  originalInvoke = supabaseClient.functions.invoke.bind(supabaseClient.functions);

  // Override the invoke method
  supabaseClient.functions.invoke = async function(functionName: string, options?: any) {
    const startTime = Date.now();
    let success = true;
    let response: any;
    let error: any;

    try {
      // Call the original method
      const result = await originalInvoke(functionName, options);
      response = result;
      
      // Check if there's an error in the response
      if (result?.error) {
        success = false;
        error = result.error;
      }

      return result;
    } catch (err) {
      success = false;
      error = err;
      throw err;
    } finally {
      // Track the API call with full path
      const duration = Date.now() - startTime;
      const fullPath = `supabase.functions.invoke('${functionName}')`;
      apiCallAnalyzer.trackCall(fullPath, success, duration);
      
      // Log detailed information in development
      if (process.env.NODE_ENV === 'development') {
        const emoji = success ? '✅' : '❌';
        const statusText = success ? 'SUCCESS' : 'FAILED';
        console.log(
          `${emoji} [API] ${fullPath} - ${statusText} (${duration}ms)`,
          {
            service: functionName,
            body: options?.body,
            response: success ? response?.data : undefined,
            error: error
          }
        );
      }
    }
  };

  isIntercepting = true;
  console.log('🔍 API Interceptor installed - tracking all Supabase function calls');
}

/**
 * Uninstall the API interceptor
 */
export function uninstallAPIInterceptor(supabaseClient: any) {
  if (!isIntercepting || !originalInvoke) {
    return;
  }

  supabaseClient.functions.invoke = originalInvoke;
  isIntercepting = false;
  console.log('🔍 API Interceptor uninstalled');
}

/**
 * Check if the interceptor is active
 */
export function isInterceptorActive(): boolean {
  return isIntercepting;
}