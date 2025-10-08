import { FormField, GroupedFormData } from "@/types";

 export function groupFormData(
        fields: FormField[],
        isGroup: boolean
    ): GroupedFormData[] {
        if (!isGroup) {
            return [{ groupName: "", fields }];
        }

        const groups = fields.reduce<Record<string, FormField[]>>((acc, field) => {
            const groupName = field.CombinedName?.trim() || "";
            if (groupName) {
                if (!acc[groupName]) acc[groupName] = [];
                acc[groupName].push(field);
            } else {
                if (!acc.__ungrouped) acc.__ungrouped = [];
                acc.__ungrouped.push(field);
            }
            return acc;
        }, {});

        return Object.entries(groups).map(([groupName, fields]) => ({
            groupName: groupName !== "__ungrouped" ? groupName : "",
            fields,
        }));
}

export const validateForm = (formData, formValues) => {
    const errors = {};
    formData.forEach(field => {
        if (field.FieldEnabledTag === "Y" && field.isMandatory === "true" && field.type !== "WDisplayBox") {
            if (!formValues[field.wKey] || formValues[field.wKey]?.toString()?.trim() === "") {
                errors[field.wKey] = `${field.label} is required`;
            }
        }
    });
    return errors;
};

// Helper function to generate unique ID
export const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export function parseXMLStringToObject(xmlString) {
    const result = {};
    
    // Regular expression to match XML tags with content
    const tagRegex = /<(\w+)>(.*?)<\/\1>/g;
    
    let match;
    
    while ((match = tagRegex.exec(xmlString)) !== null) {
        const tagName = match[1];
        const tagValue = match[2].trim();
        
        // Only add to result if the value is not empty
        if (tagValue !== '' && tagName !== "FormType") {
            result[tagName] = tagValue;
        }
    }
    
    return result;
}

export function extractTagsForTabsDisabling(xmlString: any) {
  try {
        // Wrap the content in a root element to make it valid XML
        const wrappedXml = `<root>${xmlString}</root>`;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(wrappedXml, "text/xml");
        
        // Check for parsing errors
        const parseError = xmlDoc.getElementsByTagName("parsererror")[0];
        if (parseError) {
            console.error("XML parsing error:", parseError.textContent);
            return {};
        }
        
        // Get the flag value
        const flagElement = xmlDoc.getElementsByTagName("Flag")[0];
        const flagValue = flagElement ? flagElement.textContent : "";
        
        // If flag is "T", extract all tags except Flag and Message
        if (flagValue === "T") {
            const allElements = xmlDoc.getElementsByTagName('*');
            const result = {};
            
            for (let i = 0; i < allElements.length; i++) {
                const element = allElements[i];
                const tagName = element.tagName;
                
                // Skip root, Flag and Message tags
                if (tagName !== "root" && tagName !== "Flag" && tagName !== "Message") {
                    let value :any= element.textContent;
                    
                    // Convert string "true"/"false" to boolean
                    if (value.toLowerCase() === "true") {
                        value = true;
                    } else if (value.toLowerCase() === "false") {
                        value = false;
                    }
                    
                    result[tagName] = value;
                }
            }
            
            return result;
        }
        
        return {}; // Return empty object if flag is not "T"
    } catch (error) {
        console.error("Error parsing XML:", error);
        return {};
    }
}
