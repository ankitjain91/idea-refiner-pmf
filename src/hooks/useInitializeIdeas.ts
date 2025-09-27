import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useInitializeIdeas = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeIdeas = async () => {
      try {
        // Check if ideas already exist
        const { data: existingIdeas, error: checkError } = await supabase
          .from('startup_idea_suggestions')
          .select('id')
          .limit(1);

        if (checkError) {
          console.error('Error checking for existing ideas:', checkError);
          setIsLoading(false);
          return;
        }

        // If no ideas exist, populate them
        if (!existingIdeas || existingIdeas.length === 0) {
          console.log('No startup ideas found, populating database...');
          
          const { data, error } = await supabase.functions.invoke('populate-startup-ideas');
          
          if (error) {
            console.error('Error populating startup ideas:', error);
          } else {
            console.log('Successfully populated startup ideas:', data);
            setIsInitialized(true);
          }
        } else {
          console.log('Startup ideas already exist in database');
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing startup ideas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeIdeas();
  }, []);

  return { isInitialized, isLoading };
};