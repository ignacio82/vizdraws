dataframeToD3 <- function(df) {
  if (missing(df) || is.null(df)) {
    return(list())
  }
  if (!is.data.frame(df)) {
    stop("vizdraws: the input must be a dataframe", call. = FALSE)
  }

  row.names(df) <- NULL
  apply(df, 1, function(row) as.list(row[!is.na(row)]))
}
