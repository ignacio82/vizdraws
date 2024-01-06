#' Visualize Probabilities
#'
#' A function to visualize probabilities using a lollipop chart
#'
#' @title lollipops
#'
#' @return A HTML widget object.
#' @export
#'
lollipops <-
  function(data,
           plotBackgroundColor = "white",
           width = NULL,
           height = NULL,
           elementId = NULL) {
    verifyDataConditions(data)

    opts = list(data = dataframeToD3(data.frame(data)),
                plotBackgroundColor = plotBackgroundColor)

    # Define sizing policy
    sizingPolicy = htmlwidgets::sizingPolicy(
      defaultWidth = 400,
      defaultHeight = 400,
      browser.fill = TRUE
    )
    # create widget
    htmlwidgets::createWidget(
      name = 'lollipops',
      opts,
      width = width,
      height = height,
      package = 'vizdraws',
      elementId = elementId,
      sizingPolicy = sizingPolicy
    )
  }


verifyDataConditions <- function(data) {
  # Check if 'data' is a data.frame
  if (!is.data.frame(data)) {
    stop("Input is not a data.frame.")
  }

  # Check if 'data' has the required columns
  requiredColumns <- c("Name", "Prior", "Posterior")
  if (!all(requiredColumns %in% colnames(data))) {
    stop("Data.frame is missing required columns: Name, Prior, Posterior.")
  }

  # Check if 'Prior' and 'Posterior' are numeric
  if (!all(sapply(data[c("Prior", "Posterior")], is.numeric))) {
    stop("Columns 'Prior' and 'Posterior' must be numeric.")
  }

  # Check if values in 'Prior' and 'Posterior' are between 0 and 1
  if (!all(data$Prior >= 0 & data$Prior <= 1) || !all(data$Posterior >= 0 & data$Posterior <= 1)) {
    stop("Values in 'Prior' and 'Posterior' must be between 0 and 1.")
  }

  # If all conditions are met, return TRUE
  return(TRUE)
}


