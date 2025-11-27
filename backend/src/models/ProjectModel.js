//Admin – can create projects, manage users, and view all data
import { supabase } from "../config/database.js";

//Add a new project
export const createProject = async (
    title,
    description,
    status,
    deadline,
    created_by
) => {
  try {
    const { data, error } = await supabase
      .from("projects") 
      .insert({
        title,
        description,
        status,
        deadline,
        created_by,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding project:", error);
    throw error;
  }
};

//Get all projects
export const getProjects = async () => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("title", { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
};

//Get project by title
export const getProjectByTitle = async (title) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("title", title)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching project by title:", error);
    throw error;
  }
};
