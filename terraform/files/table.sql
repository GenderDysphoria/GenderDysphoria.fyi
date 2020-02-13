CREATE EXTERNAL TABLE gdbible.events (
  dts TIMESTAMP,
  page STRING,
  client_start TIMESTAMP,
  client_end TIMESTAMP,
  duration INT,
  useragent struct<
    browser: struct< name:STRING, version:STRING, major: INT >,
    os: struct< name:STRING, version:STRING >
  >,
  `query` struct<
    tid: STRING,
    page_height:INT,
    viewport_height:INT,
    max_scroll:INT,
    viewed:INT,
    language:STRING,
    referrer:STRING
  >,
  original struct<c_ip: STRING>
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://gdbible-analytics/Converted'
