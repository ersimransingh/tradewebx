import { FormField } from "@/types";
import apiService from "@/utils/apiService";
import { BASE_URL, PATH_URL } from "@/utils/constants";
import axios from "axios";

export const handleValidationForDisabledField = async (
    field: FormField,
    formValues: any,
    masterValues: any,
    collectUpdates: (updates: Array<{
        fieldKey: string;
        isDisabled: boolean;
        tagValue: string;
    }>) => void,
) => {
    if (!field.ValidationAPI || !field.ValidationAPI.dsXml) return;

    const { J_Ui, Sql, X_Filter, X_Filter_Multiple, J_Api } = field.ValidationAPI.dsXml;

    // Validation logic
    let xFilter = '';
    let xFilterMultiple = '';
    let shouldCallApi = true;
    const errors = [];

    if (X_Filter_Multiple) {
        Object.entries(X_Filter_Multiple).forEach(([key, placeholder]) => {
            let fieldValue;
            if (typeof placeholder === 'string' && placeholder.startsWith('##') && placeholder.endsWith('##')) {
                const formKey = placeholder.slice(2, -2);
                fieldValue = formValues[formKey] || masterValues[formKey];
            } else {
                fieldValue = placeholder;
            }

            if (!fieldValue) {
                shouldCallApi = false;
                errors.push(key);
            } else {
                xFilterMultiple += `<${key}>${fieldValue}</${key}>`;
            }
        });
    } else if (X_Filter) {
        let fieldValue;
        if (X_Filter.startsWith('##') && X_Filter.endsWith('##')) {
            const formKey = X_Filter.slice(2, -2);
            fieldValue = formValues[formKey] || masterValues[formKey];
        } else {
            fieldValue = X_Filter;
        }

        if (!fieldValue) {
            shouldCallApi = false;
            errors.push(X_Filter);
        } else {
            xFilter = `<${X_Filter}>${fieldValue}</${X_Filter}>`;
        }
    }

    if (!shouldCallApi) return;

    // API call preparation
    const jUi = Object.entries(J_Ui || {}).map(([key, value]) => `"${key}":"${value}"`).join(',');
    const jApi = Object.entries(J_Api || {}).map(([key, value]) => `"${key}":"${value}"`).join(',');

    const xmlData = `<dsXml>
        <J_Ui>${jUi}</J_Ui>
        <Sql>${Sql || ''}</Sql>
        <X_Filter>${xFilter}</X_Filter>
        <X_Filter_Multiple>${xFilterMultiple}</X_Filter_Multiple>
        <J_Api>${jApi}</J_Api>
    </dsXml>`;

    try {
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

        const columnData = response?.data?.data?.rs0[0]?.Column1;
        if (!columnData) return;

        let processedResponse = columnData;
        if (!processedResponse?.trim().startsWith("<root>")) {
            processedResponse = `<root>${processedResponse}</root>`;
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(processedResponse, "text/xml");

        const flag = xmlDoc.getElementsByTagName("Flag")[0]?.textContent;
        const dynamicTags = Array.from(xmlDoc.documentElement.children).filter(
            (node) => node.tagName !== "Flag" && node.tagName !== "Message"
        );

        const updates = dynamicTags.map((tag) => {
            const tagName = tag.tagName;
            const tagValue = tag.textContent;
            const tagFlag = tagValue.toLowerCase();
            const isDisabled = tagFlag === 'false';

            return {
                fieldKey: tagName,
                isDisabled,
                tagValue
            };
        });

        // Collect updates instead of setting state directly
        collectUpdates(updates);

    } catch (error) {
        console.error('Validation API error:', error);
    }
};