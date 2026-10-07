import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  GetBucketLifecycleConfigurationCommand
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


const bucket = process.env.BUCKET_NAME;
const prefix = process.env.PREFIX || "documents/";

const s3 = new S3Client({});


function json(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body)
  };
}


function safeFileName(name) {
  return String(name || "document")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 150);
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function html() {

  const page = [

    "<!DOCTYPE html>",

    "<html>",

    "<head>",

    '<meta charset="UTF-8">',

    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',

    "<title>Amazon S3 Lifecycle Management</title>",

    "<style>",

    "body {",
    "  font-family: Arial, sans-serif;",
    "  margin: 0;",
    "  background: #f4f6f8;",
    "  color: #222;",
    "}",

    ".container {",
    "  max-width: 1100px;",
    "  margin: 40px auto;",
    "  padding: 20px;",
    "}",

    "h1 {",
    "  margin-bottom: 8px;",
    "}",

    ".subtitle {",
    "  color: #666;",
    "  margin-bottom: 30px;",
    "}",

    ".card {",
    "  background: white;",
    "  padding: 22px;",
    "  margin-bottom: 20px;",
    "  border-radius: 10px;",
    "  box-shadow: 0 2px 8px rgba(0,0,0,0.08);",
    "}",

    "button {",
    "  background: #232f3e;",
    "  color: white;",
    "  border: none;",
    "  padding: 10px 16px;",
    "  border-radius: 6px;",
    "  cursor: pointer;",
    "  margin-right: 8px;",
    "}",

    "button:hover {",
    "  opacity: 0.9;",
    "}",

    "input {",
    "  padding: 9px;",
    "  margin-right: 8px;",
    "}",

    "table {",
    "  width: 100%;",
    "  border-collapse: collapse;",
    "  margin-top: 15px;",
    "}",

    "th, td {",
    "  border-bottom: 1px solid #ddd;",
    "  padding: 12px;",
    "  text-align: left;",
    "}",

    "th {",
    "  background: #f0f2f4;",
    "}",

    ".status {",
    "  padding: 10px;",
    "  background: #eef5ff;",
    "  border-radius: 6px;",
    "  margin-top: 10px;",
    "  white-space: pre-wrap;",
    "}",

    ".lifecycle-step {",
    "  padding: 12px;",
    "  border-left: 4px solid #232f3e;",
    "  margin: 10px 0;",
    "  background: #f8f9fa;",
    "}",

    "</style>",

    "</head>",

    "<body>",

    '<div class="container">',

    "<h1>Amazon S3 Lifecycle Management</h1>",

    '<div class="subtitle">',
    "Serverless document management using Amazon S3, Lambda and API Gateway",
    "</div>",


    '<div class="card">',

    "<h2>Project Information</h2>",

    "<p><strong>Bucket:</strong> " +
      escapeHtml(bucket) +
      "</p>",

    "<p><strong>Folder:</strong> " +
      escapeHtml(prefix) +
      "</p>",

    '<div class="status">',
    "S3 bucket is private. ",
    "Documents are accessed using secure presigned URLs.",
    "</div>",

    "</div>",


    '<div class="card">',

    "<h2>Upload Document</h2>",

    '<input type="file" id="fileInput">',

    '<button onclick="uploadFile()">Upload</button>',

    '<div id="uploadStatus" class="status">',
    "Select a file and click Upload.",
    "</div>",

    "</div>",


    '<div class="card">',

    "<h2>Lifecycle Policy</h2>",

    '<div id="lifecycle">',
    "Loading lifecycle configuration...",
    "</div>",

    "</div>",


    '<div class="card">',

    "<h2>Documents</h2>",

    '<button onclick="loadObjects()">Refresh Documents</button>',

    '<div id="objects">',
    "Loading documents...",
    "</div>",

    "</div>",

    "</div>",


    "<script>",

    "function escapeHtml(value) {",
    '  return String(value ?? "")',
    '    .replace(/&/g, "&amp;")',
    '    .replace(/</g, "&lt;")',
    '    .replace(/>/g, "&gt;")',
    '    .replace(/"/g, "&quot;")',
    '    .replace(/\'/g, "&#039;");',
    "}",

    "async function uploadFile() {",

    '  const input = document.getElementById("fileInput");',

    '  const status = document.getElementById("uploadStatus");',

    "  if (!input.files.length) {",

    '    status.textContent = "Please select a file first.";',

    "    return;",

    "  }",

    "  const file = input.files[0];",

    '  status.textContent = "Preparing upload...";',

    "  try {",

    "    const response = await fetch(",

    '      "/api/upload-url?fileName=" +',

    "      encodeURIComponent(file.name) +",

    '      "&contentType=" +',

    "      encodeURIComponent(file.type || ",

    '"application/octet-stream"),',

    "      { method: \"POST\" }",

    "    );",

    "    const data = await response.json();",

    "    if (!response.ok) {",

    '      throw new Error(data.message || "Could not create upload URL.");',

    "    }",

    '    status.textContent = "Uploading...";',

    "    const uploadResponse = await fetch(data.uploadUrl, {",

    '      method: "PUT",',

    "      headers: {",

    '        "Content-Type": file.type || "application/octet-stream"',

    "      },",

    "      body: file",

    "    });",

    "    if (!uploadResponse.ok) {",

    '      throw new Error("S3 upload failed.");',

    "    }",

    '    status.textContent = "Upload successful.";',

    '    input.value = "";',

    "    loadObjects();",

    "  } catch (error) {",

    '    status.textContent = "Upload failed: " + error.message;',

    "  }",

    "}",


    "async function loadObjects() {",

    '  const container = document.getElementById("objects");',

    '  container.textContent = "Loading...";',

    "  try {",

    '    const response = await fetch("/api/objects");',

    "    const data = await response.json();",

    "    if (!response.ok) {",

    '      throw new Error(data.message || "Unable to load objects.");',

    "    }",

    "    if (!data.objects || data.objects.length === 0) {",

    '      container.innerHTML = "<p>No documents found.</p>";',

    "      return;",

    "    }",

    '    let table = "<table>";',

    '    table += "<thead>";',

    '    table += "<tr>";',

    '    table += "<th>File</th>";',

    '    table += "<th>Size</th>";',

    '    table += "<th>Storage Class</th>";',

    '    table += "<th>Last Modified</th>";',

    '    table += "<th>Action</th>";',

    '    table += "</tr>";',

    '    table += "</thead>";',

    '    table += "<tbody>";',

    "    data.objects.forEach(function(object) {",

    '      const size = String(object.size) + " bytes";',

    "      const modified = object.lastModified",

    '        ? new Date(object.lastModified).toLocaleString()',

    '        : "-";',

    "      const encodedKey = encodeURIComponent(object.key);",

    '      table += "<tr>";',

    '      table += "<td>" + escapeHtml(object.key) + "</td>";',

    '      table += "<td>" + escapeHtml(size) + "</td>";',

    '      table += "<td>" + escapeHtml(object.storageClass || "STANDARD") + "</td>";',

    '      table += "<td>" + escapeHtml(modified) + "</td>";',

    '      table += "<td>";',

    '      table += "<button onclick=\\"downloadFile(\\\'" + encodedKey + "\\\')\\">Download</button>";',

    '      table += "</td>";',

    '      table += "</tr>";',

    "    });",

    '    table += "</tbody>";',

    '    table += "</table>";',

    "    container.innerHTML = table;",

    "  } catch (error) {",

    '    container.textContent = "Error: " + error.message;',

    "  }",

    "}",


    "async function downloadFile(encodedKey) {",

    "  try {",

    '    const response = await fetch("/api/download-url?key=" + encodedKey);',

    "    const data = await response.json();",

    "    if (!response.ok) {",

    '      throw new Error(data.message || "Unable to create download URL.");',

    "    }",

    "    window.open(data.downloadUrl, \"_blank\");",

    "  } catch (error) {",

    '    alert("Download failed: " + error.message);',

    "  }",

    "}",


    "async function loadLifecycle() {",

    '  const container = document.getElementById("lifecycle");',

    "  try {",

    '    const response = await fetch("/api/lifecycle");',

    "    const data = await response.json();",

    "    if (!response.ok) {",

    '      throw new Error(data.message || "Unable to load lifecycle.");',

    "    }",

    "    if (!data.rules || data.rules.length === 0) {",

    '      container.innerHTML = "<p>No lifecycle rules found.</p>";',

    "      return;",

    "    }",

    '    let lifecycleHtml = "";',

    "    data.rules.forEach(function(rule) {",

    '      lifecycleHtml += "<div class=\\"lifecycle-step\\">";',

    '      lifecycleHtml += "<strong>Rule:</strong> ";',

    '      lifecycleHtml += escapeHtml(rule.id || "Unnamed");',

    '      lifecycleHtml += "<br>";',

    '      lifecycleHtml += "<strong>Status:</strong> ";',

    '      lifecycleHtml += escapeHtml(rule.status || "-");',

    '      lifecycleHtml += "<br>";',

    "      if (rule.filter) {",

    '        lifecycleHtml += "<strong>Prefix:</strong> ";',

    '        lifecycleHtml += escapeHtml(rule.filter.prefix || "-");',

    '        lifecycleHtml += "<br>";',

    "      }",

    "      if (rule.transitions && rule.transitions.length) {",

    "        rule.transitions.forEach(function(transition) {",

    '          lifecycleHtml += "Transition: Day ";',

    '          lifecycleHtml += escapeHtml(String(transition.days || "-"));',

    '          lifecycleHtml += " → ";',

    '          lifecycleHtml += escapeHtml(transition.storageClass || "-");',

    '          lifecycleHtml += "<br>";',

    "        });",

    "      }",

    "      if (rule.expiration && rule.expiration.days) {",

    '        lifecycleHtml += "Expiration: Day ";',

    '        lifecycleHtml += escapeHtml(String(rule.expiration.days));',

    '        lifecycleHtml += " → Delete";',

    "      }",

    '      lifecycleHtml += "</div>";',

    "    });",

    "    container.innerHTML = lifecycleHtml;",

    "  } catch (error) {",

    '    container.textContent = "Error: " + error.message;',

    "  }",

    "}",


    "loadObjects();",

    "loadLifecycle();",

    "</script>",

    "</body>",

    "</html>"

  ];


  return {

    statusCode: 200,

    headers: {

      "Content-Type": "text/html; charset=utf-8",

      "Cache-Control": "no-store"

    },

    body: page.join("\n")

  };

}


export const handler = async (event) => {

  try {

    const method =
      event.requestContext?.http?.method ||
      event.httpMethod ||
      "GET";

    const path =
      event.rawPath ||
      event.path ||
      "/";


    if (method === "GET" && path === "/") {

      return html();

    }


    if (method === "GET" && path === "/api/health") {

      return json(200, {

        status: "healthy",

        service: "S3 Lifecycle Management App",

        bucket: bucket

      });

    }


    if (method === "GET" && path === "/api/objects") {

      const result = await s3.send(

        new ListObjectsV2Command({

          Bucket: bucket,

          Prefix: prefix

        })

      );


      const objects = (result.Contents || [])

        .filter(function(item) {

          return item.Key !== prefix;

        })

        .map(function(item) {

          return {

            key: item.Key,

            size: item.Size,

            storageClass:
              item.StorageClass || "STANDARD",

            lastModified:
              item.LastModified

          };

        });


      return json(200, {

        objects: objects

      });

    }


    if (
      method === "POST" &&
      path === "/api/upload-url"
    ) {

      const params =
        event.queryStringParameters || {};

      const fileName =
        safeFileName(params.fileName);

      const contentType =
        params.contentType ||
        "application/octet-stream";

      const key =
        prefix +
        Date.now() +
        "-" +
        fileName;


      const command =
        new PutObjectCommand({

          Bucket: bucket,

          Key: key,

          ContentType: contentType

        });


      const uploadUrl =
        await getSignedUrl(

          s3,

          command,

          {
            expiresIn: 900
          }

        );


      return json(200, {

        uploadUrl: uploadUrl,

        key: key

      });

    }


    if (
      method === "GET" &&
      path === "/api/download-url"
    ) {

      const params =
        event.queryStringParameters || {};

      const key = params.key;


      if (
        !key ||
        !key.startsWith(prefix)
      ) {

        return json(400, {

          message:
            "Invalid document key."

        });

      }


      const command =
        new GetObjectCommand({

          Bucket: bucket,

          Key: key

        });


      const downloadUrl =
        await getSignedUrl(

          s3,

          command,

          {
            expiresIn: 900
          }

        );


      return json(200, {

        downloadUrl:
          downloadUrl

      });

    }


    if (
      method === "GET" &&
      path === "/api/lifecycle"
    ) {

      const result =
        await s3.send(

          new GetBucketLifecycleConfigurationCommand({

            Bucket: bucket

          })

        );


      const rules =
        (result.Rules || []).map(
          function(rule) {

            const transitions =
              (rule.Transitions || []).map(
                function(item) {

                  return {

                    days: item.Days,

                    storageClass:
                      item.StorageClass

                  };

                }
              );


            return {

              id: rule.ID,

              status: rule.Status,

              filter: rule.Filter
                ? { prefix: rule.Filter.Prefix || (rule.Filter.And && rule.Filter.And.Prefix) || "" }
                : (rule.Prefix ? { prefix: rule.Prefix } : null),

              transitions:
                transitions,

              expiration:
                rule.Expiration?.Days
                  ? {
                      days:
                        rule.Expiration.Days
                    }
                  : (rule.ExpirationInDays
                      ? {
                          days:
                            rule.ExpirationInDays
                        }
                      : null)

            };

          }
        );


      return json(200, {

        rules: rules

      });

    }


    return json(404, {

      message:
        "Route not found."

    });


  } catch (error) {

    console.error(
      "Application error:",
      error
    );


    return json(500, {

      error:
        "Server error",

      message:
        error.message

    });

  }

};